"use client";

import { useState } from "react";
import { uploadBytesResumable, getDownloadURL, ref } from "firebase/storage";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { storage, db } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentEntry } from "@/lib/types/schema";
import { extractDocument } from "@/app/actions/extract";
import { computeContentHash } from "@/lib/utils/fingerprint";
import { UploadCloud } from "lucide-react";

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
                    const extraction = await extractDocument({ fileUrl: downloadUrl, type: docType });

                    if (!extraction.success || !extraction.data) {
                        throw new Error(extraction.error || "Extraction failed");
                    }

                    const contentHash = await computeContentHash(extraction.data);
                    const duplicatesQuery = query(
                        collection(db, "companies", companyId, "documents"),
                        where("contentHash", "==", contentHash)
                    );

                    const duplicatesSnap = await getDocs(duplicatesQuery);
                    const isDuplicate = !duplicatesSnap.empty;

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
            onClick={() => document.getElementById("file-upload")?.click()}
            className={`
                relative cursor-pointer
                border-[2px] border-dashed rounded-[var(--radius-md)]
                p-8 text-center
                transition-all duration-200
                ${isDragOver
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 scale-[1.01]"
                    : "border-[var(--border)] bg-[var(--muted)]/30 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/3"
                }
            `.trim()}
            style={{ transitionTimingFunction: "var(--bounce)" }}
        >
            <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleUpload(e.target.files[0]);
                    }
                }}
            />

            {uploading ? (
                <div className="space-y-3">
                    <div className="w-10 h-10 border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-[var(--accent)]">Uploading... {progress}%</p>
                    <div className="w-full max-w-xs mx-auto bg-[var(--muted)] rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
                        <UploadCloud className="w-6 h-6 text-[var(--accent)]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-heading)" }}>
                        Drag & Drop to Upload
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                        Supports PDF, JPG, PNG (Max 10MB)
                    </p>
                </div>
            )}
        </div>
    );
}
