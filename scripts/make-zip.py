import zipfile
import os

zip_filename = 'nearnotice-build.zip'
dist_dir = 'dist'

if os.path.exists(zip_filename):
    os.remove(zip_filename)

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = os.path.join(root, file)
            # Guarantee POSIX forward slashes for Linux compatibility on Hostinger
            rel_path = os.path.relpath(full_path, dist_dir).replace('\\', '/')
            z.write(full_path, rel_path)
            print(f"Added: {rel_path}")

print(f"\nSuccessfully generated Linux-compatible {zip_filename}!")
