# PWA Icons Required

To complete the PWA setup, generate and add the following icon files to the `/public` directory:

## Required Icons

1. **icon-192x192.png** - 192x192px app icon (for smaller displays)
2. **icon-512x512.png** - 512x512px app icon (for larger displays)
3. **icon.png** - Notification icon (recommended 256x256px or smaller)
4. **badge.png** - Notification badge icon (72x72px, monochrome recommended)

## How to Generate Icons

### Option 1: Use RealFaviconGenerator (Recommended)
Visit https://realfavicongenerator.net/ and upload your logo:
- It will generate all required sizes
- Download the package and extract to `/public` folder

### Option 2: Use ImageMagick
If you have a logo file (e.g., logo.svg or logo.png):

```bash
# Install ImageMagick first
# Then run:
convert logo.png -resize 192x192 public/icon-192x192.png
convert logo.png -resize 512x512 public/icon-512x512.png
convert logo.png -resize 256x256 public/icon.png
convert logo.png -resize 72x72 -colorspace Gray public/badge.png
```

### Option 3: Use Online Tools
- https://www.pwabuilder.com/imageGenerator
- https://favicon.io/favicon-generator/

## Design Guidelines

- **App Icons (192x192, 512x512)**: Use your full color logo with padding
- **Notification Icon**: Simple, recognizable icon (will be tinted by OS)
- **Badge Icon**: Small, simple, monochrome icon for notification badge
- **Format**: PNG with transparency where appropriate
- **Safe Area**: Keep important content within 80% of the icon area

## Temporary Workaround

For development/testing, you can use simple colored squares:
1. Create a 512x512 image with your brand color
2. Add a white letter "O" in the center
3. Resize to other required sizes

The manifest.ts and service worker are already configured to use these icons.
