export const compressImage = (file, maxSizeMB = 2, maxWidthOrHeight = 1920) => {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/image.*/)) {
            return reject(new Error('File is not an image'));
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down if larger than max dimensions
                if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    } else {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Use WebP for better compression if available, else fallback to JPEG. PNG compression isn't well supported by quality param
                const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                let quality = 0.9;
                
                const attemptCompress = (q) => {
                    canvas.toBlob((blob) => {
                        if (!blob) return reject(new Error('Canvas to Blob failed'));
                        
                        // Resolve if smaller than max size, or if quality is getting too low, or if it's a PNG (lossless)
                        if (blob.size / 1024 / 1024 <= maxSizeMB || q <= 0.6 || type === 'image/png') {
                            const compressedFile = new File([blob], file.name, {
                                type: type,
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        } else {
                            attemptCompress(q - 0.1);
                        }
                    }, type, q);
                };

                attemptCompress(quality);
            };
            img.onerror = () => reject(new Error('Failed to load image into canvas'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};
