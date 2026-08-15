"use client";

import { useState, useCallback } from "react";
import { uploadBytesResumable, getDownloadURL, ref } from "firebase/storage";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentEntry } from "@/lib/types/schema";

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

                const newDoc: DocumentEntry = {
                    id: docId,
                    companyId,
                    // Simple classification for MVP
                    type: file.type === "application/pdf" ? "invoice" : "receipt",
                    status: "processing",
                    uploadedBy: user.uid,
                    fileName: file.name,
                    fileUrl: downloadUrl,
                    storagePath: storagePath,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                try {
                    await setDoc(doc(db, "companies", companyId, "documents", docId), newDoc);
                    setUploading(false);
                    setProgress(0);
                    alert("Document uploaded successfully!");
                } catch (error) {
                    console.error("Failed to save document entry", error);
                    setUploading(false);
                    alert("Upload finished, but saving to database failed.");
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
