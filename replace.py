import os
import glob

replacements = {
    "Cloud Functions for Firebase": "Next.js API Routes",
    "Cloud Functions": "Next.js API Routes",
    "Firebase Functions": "Next.js API Routes",
    "firebase deploy --only hosting,functions,firestore": "firebase deploy --only hosting,firestore",
    "functions/src": "src/app/api",
    "/functions/src": "/src/app/api",
    "firebase init` (Hosting + Functions + Firestore)": "firebase init` (Hosting + Firestore)",
    "Blaze plan": "Spark plan (Free tier)",
    "(Blaze plan)": "(Spark plan)",
    "Blaze": "Spark",
    ", Functions": "",
    " Functions,": "",
    ", Cloud Functions": "",
    "Auth, Firestore, Storage, Hosting, Functions": "Auth, Firestore, Storage, Hosting"
}

for filepath in glob.glob("docs/*.md"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Documentation updated.")
