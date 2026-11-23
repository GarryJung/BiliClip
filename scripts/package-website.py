"""Package the current static website, including historical download targets."""
from pathlib import Path
import zipfile,shutil
root=Path(__file__).resolve().parents[1]
out=root/'release/BiliClip-官网更新-2026-11-23.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name in ['index.html','welcome.html','tutorial.html','privacy.html','author.html','changelog.html','biliclip.user.js','favicon.png','logo-header.png','logo-footer.png']:
  z.write(root/name,name)
 for directory in ['assets','downloads','versions']:
  for p in sorted((root/directory).rglob('*')):
   if p.is_file() and p.name!='.DS_Store':z.write(p,p.relative_to(root))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for required in ['assets/screenshots/current-presets.png','assets/screenshots/current-copy.png','versions/8.2.0/biliclip-8.2.0.user.js']:
  assert required in z.namelist()
# Keep the unpacked preview in sync with the package delivered to the user.
with zipfile.ZipFile(out) as z:
 z.extractall(out.with_suffix(''))
print(out)
print(out.with_suffix(''))
