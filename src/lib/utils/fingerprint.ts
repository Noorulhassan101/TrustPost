export async function computeContentHash(data: Record<string, unknown>): Promise<string> {
    const normalize = (val: unknown) => {
        if (val === undefined || val === null) return "";
        return String(val).toLowerCase().trim();
    };

    // Ensure we only hash the core, deterministically predictable fields 
    // (excluding subjective scores like raw_confidence)
    const coreData = {
        vendor_name: normalize(data.vendor_name),
        invoice_number: normalize(data.invoice_number),
        invoice_date: normalize(data.invoice_date),
        total_amount: Number(data.total_amount) || 0,
        currency: normalize(data.currency)
    };

    const sortedKeys = Object.keys(coreData).sort() as (keyof typeof coreData)[];
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
        sortedObj[key] = coreData[key];
    }

    const stringified = JSON.stringify(sortedObj);

    // Use Web Crypto API which is native in both Browser and modern Node (Server Actions) environments
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(stringified);

    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
