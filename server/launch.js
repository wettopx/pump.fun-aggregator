import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
import { 
    Keypair, 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram,
    sendAndConfirmTransaction,
    VersionedTransaction 
} from "@solana/web3.js";
import { Readable } from "stream";

dotenv.config();

const IPFS_URL = "https://pump.fun/api/ipfs";
const TRADE_URL = `https://pumpportal.fun/api/trade-local`;

// Image distribution for infected tokens
const INFECTED_IMAGE_CONFIG = {
    'Bio': { count: 1, images: ['bio1.gif'] },
    'Net': { count: 3, images: ['net1.gif', 'net2.gif', 'net3.gif'] },
    'Neo': { count: 4, images: ['neo1.gif', 'neo2.gif', 'neo3.gif', 'neo4.gif'] },
    'Gero': { count: 6, images: ['gero1.gif', 'gero2.gif', 'gero3.gif', 'gero4.gif', 'gero5.gif', 'gero6.gif'] }
};

// Initialize connection
const connection = new Connection(
    process.env.RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
    "confirmed"
);

// Load server keypair from environment
let serverKeypair;
try {
    if (process.env.SERVER_MINT_PRIVATE_KEY) {
        // Decode base58 private key
        const bs58 = await import('bs58');
        const privateKeyBytes = bs58.default.decode(process.env.SERVER_MINT_PRIVATE_KEY);
        serverKeypair = Keypair.fromSecretKey(privateKeyBytes);
        
        // Verify the public key matches
        const expectedPublicKey = process.env.SERVER_MINT_WALLET;
        if (serverKeypair.publicKey.toBase58() !== expectedPublicKey) {
            throw new Error(`Public key mismatch. Expected: ${expectedPublicKey}, Got: ${serverKeypair.publicKey.toBase58()}`);
        }
        
        console.log("Server mint wallet loaded:", serverKeypair.publicKey.toBase58());
    } else {
        throw new Error("No server mint private key configured");
    }
} catch (error) {
    console.error("Failed to load server keypair:", error);
    console.log("Server-side minting disabled. Using original flow.");
}

// Get infected image based on token name prefix
function getInfectedImageForName(tokenName) {
    // Extract prefix from token name (case-insensitive)
    const nameLower = tokenName.toLowerCase();
    let selectedPrefix = null;
    let selectedImage = null;
    
    // Check which prefix the token name starts with
    for (const [prefix, config] of Object.entries(INFECTED_IMAGE_CONFIG)) {
        if (nameLower.startsWith(prefix.toLowerCase())) {
            selectedPrefix = prefix;
            // Randomly select one image from the available images for this prefix
            const randomIndex = Math.floor(Math.random() * config.images.length);
            selectedImage = config.images[randomIndex];
            break;
        }
    }
    
    if (!selectedImage) {
        // Fallback: default to Gero images if no prefix matches (since Gero is most common)
        console.log(`No matching prefix for ${tokenName}, defaulting to Gero images`);
        const geroConfig = INFECTED_IMAGE_CONFIG['Gero'];
        const randomIndex = Math.floor(Math.random() * geroConfig.images.length);
        selectedImage = geroConfig.images[randomIndex];
        selectedPrefix = 'Gero';
    }
    
    console.log(`Selected ${selectedImage} for ${tokenName} (prefix: ${selectedPrefix})`);
    return selectedImage;
}

// Convert buffer to stream
function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

// Server-side mint execution
async function executeServerMint(mintKeypair, transactionBuffer, userPubKey) {
    try {
        // Deserialize the transaction
        const mintTxBytes = new Uint8Array(transactionBuffer);
        const transaction = VersionedTransaction.deserialize(mintTxBytes);
        
        // Sign with mint keypair
        transaction.sign([mintKeypair]);
        
        // Sign and send with server keypair
        transaction.sign([serverKeypair]);
        
        // Send the transaction
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true,
            maxRetries: 3
        });
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`Server minted token: ${signature}`);
        return signature;
    } catch (error) {
        console.error("Server mint failed:", error);
        throw error;
    }
}

export async function buildMintTx(name, symbol, imageBuffer, userPubKey, launchType = 'classic', socials = {}, devBuyAmount = 0, useServerMint = false) {
    console.log(`${launchType} token creation for ${name} (${symbol})`);
    console.log(`Server mint mode: ${useServerMint ? 'ENABLED' : 'DISABLED'}`);

    if (!process.env.PUMP_FUN_API_KEY) {
        throw new Error("API key missing");
    }

    try {
        let finalName = name;
        let imageStream;
        let imageFileName;
        
        // For infected tokens, select image based on name prefix
        if (launchType === 'infected' && !imageBuffer) {
            const selectedImage = getInfectedImageForName(finalName);
            const imagePath = path.join("ic", selectedImage);
            
            // Check if the image exists
            if (!fs.existsSync(imagePath)) {
                console.error(`Infected image not found: ${imagePath}`);
                // Try fallback to a default Gero image
                const fallbackImage = 'gero1.gif';
                const fallbackPath = path.join("ic", fallbackImage);
                if (fs.existsSync(fallbackPath)) {
                    console.log(`Using fallback image: ${fallbackImage}`);
                    imageStream = fs.createReadStream(fallbackPath);
                    imageFileName = fallbackImage;
                } else {
                    throw new Error(`No infected images found in ic folder`);
                }
            } else {
                imageStream = fs.createReadStream(imagePath);
                imageFileName = selectedImage;
                console.log(`Using infected image: ${selectedImage} from ic folder`);
            }
        } else if (imageBuffer) {
            // Convert buffer to stream for classic tokens
            imageStream = bufferToStream(imageBuffer);
            imageFileName = `${name.replace(/\s+/g, '-')}.png`; // Default filename
        } else {
            throw new Error("No image provided for classic token");
        }

        // 1. Upload to IPFS
        const form = new FormData();
        form.append("file", imageStream, imageFileName);
        form.append("name", finalName);
        form.append("symbol", symbol);
        
        const description = 'Created and backed by @diskdotfun';
            
        form.append("description", description);
        form.append("showName", "true");
        
        // Add socials if provided (for classic tokens)
        if (launchType === 'classic') {
            if (socials.twitter) form.append("twitter", socials.twitter);
            if (socials.telegram) form.append("telegram", socials.telegram);
            if (socials.website) form.append("website", socials.website);
        }

        const ipfsResponse = await fetch(IPFS_URL, {
            method: "POST",
            body: form,
            timeout: 10000
        });

        if (!ipfsResponse.ok) {
            throw new Error(`IPFS failed: ${ipfsResponse.status}`);
        }

        const { metadataUri } = await ipfsResponse.json();
        console.log(`${launchType} IPFS upload successful:`, metadataUri);

        if (!metadataUri) {
            throw new Error("IPFS upload did not return metadata URI");
        }

        // 2. Generate mint keypair
        const mintKeypair = Keypair.generate();

        // 3. Build transaction payload
        console.log(`Building ${launchType} transaction with name: ${finalName}`);

        // Determine which public key to use for the transaction
        // If server mint is enabled, use server's public key, otherwise use user's
        const transactionCreator = useServerMint && serverKeypair ? 
            serverKeypair.publicKey.toBase58() : userPubKey;

        const transactionPayload = {
            publicKey: transactionCreator,  // Who creates the transaction
            action: "create",
            tokenMetadata: { 
                name: finalName, 
                symbol: symbol, 
                uri: metadataUri 
            },
            mint: mintKeypair.publicKey.toBase58(),
            denominatedInSol: "true",
            amount: 0,  // Always 0 since dev buy is removed
            slippage: 10,
            priorityFee: 0.0005,
            pool: "pump"
        };

        // 4. API call
        const tradeResponse = await fetch(`${TRADE_URL}?api-key=${process.env.PUMP_FUN_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transactionPayload),
            timeout: 15000
        });

        console.log(`${launchType} API response:`, tradeResponse.status);

        if (!tradeResponse.ok) {
            const errorText = await tradeResponse.text();
            console.error(`${launchType} API error response:`, errorText);
            throw new Error(`API error (${tradeResponse.status}): ${errorText}`);
        }

        const txBuffer = await tradeResponse.arrayBuffer();
        console.log(`${launchType} transaction buffer size:`, txBuffer.byteLength);
        
        if (txBuffer.byteLength === 0) {
            throw new Error("Empty transaction buffer received from API");
        }

        // Result object
        const result = {
            mint: mintKeypair.publicKey.toBase58(),
            mintSecret: Array.from(mintKeypair.secretKey),
            launchType: launchType,
            finalName: finalName,
            creator: userPubKey  // Always store the actual user as creator
        };

        // If server mint is enabled and we have a server keypair, execute the mint
        if (useServerMint && serverKeypair) {
            try {
                const mintSignature = await executeServerMint(
                    mintKeypair, 
                    txBuffer, 
                    userPubKey
                );
                result.mintSignature = mintSignature;
                result.serverMinted = true;
                console.log(`Token created successfully via server mint: ${finalName} (${mintKeypair.publicKey.toBase58()})`);
            } catch (serverMintError) {
                console.error("Server mint failed, falling back to client mint:", serverMintError);
                // Fall back to client-side minting
                result.serializedTx = Array.from(new Uint8Array(txBuffer));
                result.serverMinted = false;
            }
        } else {
            // Client-side minting (original flow)
            result.serializedTx = Array.from(new Uint8Array(txBuffer));
            result.serverMinted = false;
        }

        console.log(`Transaction prepared for ${launchType} token: ${finalName} (${mintKeypair.publicKey.toBase58()})`);
        
        return result;

    } catch (error) {
        console.error(`${launchType} creation failed:`, error);
        throw error;
    }
}