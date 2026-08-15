"use client";

import { useState } from "react";
import { uploadBytesResumable, getDownloadURL, ref } from "firebase/storage";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { storage, db } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentEntry } from "@/lib/types/schema";
import { extractDocument } from "@/app/actions/extract";
import { computeContentHash } from "@/lib/utils/fingerprint";

export function UploadZone() {
    const { user, companyId } = useAuth();
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleUpload = async (file: File) => {
        if (!user || !companyId) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("File size exceeds 10MB limit.");
            return;
        }

        const isValidFormat = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
        if (!isValidFormat) {
            alert("Invalid format. Please upload PDF, JPG, or PNG.");
            return;
        }

        setUploading(true);
        setProgress(0);

        const docId = doc(collection(db, "companies", companyId, "documents")).id;
        const storagePath = `companies/${companyId}/documents/${docId}_${file.name}`;
        const fileRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setProgress(prog);
            },
            (error) => {
                console.error("Upload failed", error);
                alert("Upload failed. Try again.");
                setUploading(false);
            },
            async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                const docType = file.type === "application/pdf" ? "invoice" : "receipt";

                try {
                    // 1. Send it to Gemini via Server Action
                    const extraction = await extractDocument({ fileUrl: downloadUrl, type: docType });

                    if (!extraction.success || !extraction.data) {
                        throw new Error(extraction.error || "Extraction failed");
                    }

                    // 2. Compute fingerprint
                    const contentHash = await computeContentHash(extraction.data);

                    // 3. Check for duplicates in this company
                    const duplicatesQuery = query(
                        collection(db, "companies", companyId, "documents"),
                        where("contentHash", "==", contentHash)
                    );

                    const duplicatesSnap = await getDocs(duplicatesQuery);
                    const isDuplicate = !duplicatesSnap.empty;

                    // 4. Construct final Document Entry
                    const newDoc: DocumentEntry = {
                        id: docId,
                        companyId,
                        type: docType,
                        status: isDuplicate ? "possible_duplicate" : "ready",
                        uploadedBy: user.uid,
                        fileName: file.name,
                        fileUrl: downloadUrl,
                        storagePath: storagePath,
                        extractionResult: extraction.data,
                        contentHash: contentHash,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };

                    await setDoc(doc(db, "companies", companyId, "documents", docId), newDoc);
                    setUploading(false);
                    setProgress(0);
                    alert(`Document processed successfully! ${isDuplicate ? "(Warning: Possible Duplicate)" : ""}`);
                } catch (error) {
                    console.error("Failed to process document entry", error);
                    setUploading(false);
                    alert("Upload finished, but extraction/saving failed.");

                    // Fallback save exactly as it was
                    const fallbackDoc: DocumentEntry = {
                        id: docId,
                        companyId,
                        type: docType,
                        status: "error",
                        uploadedBy: user.uid,
                        fileName: file.name,
                        fileUrl: downloadUrl,
                        storagePath: storagePath,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };
                    await setDoc(doc(db, "companies", companyId, "documents", docId), fallbackDoc);
                }
            }
        );
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            style={{
                border: `2px dashed ${isDragOver ? '#0070f3' : '#ccc'}`,
                padding: '2rem',
                textAlign: 'center',
                borderRadius: '8px',
                backgroundColor: isDragOver ? '#f0f8ff' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
        >
            <input
                id="file-upload"
                type="file"
                style={{ display: "none" }}
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleUpload(e.target.files[0]);
                    }
                }}
            />

            {uploading ? (
                <div style={{ color: '#0070f3', fontWeight: 'bold' }}>
                    Uploading... {progress}%
                </div>
            ) : (
                <div>
                    <h3 style={{ margin: '0 0 0.5rem', color: '#333' }}>Drag & Drop to Upload</h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                        Supports PDF, JPG, PNG (Max 10MB)
                    </p>
                </div>
            )}
        </div>
    );
}
