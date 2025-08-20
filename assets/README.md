# Assets Directory

This directory contains static assets for the Splice Supply Bot Mini App.

## Directory Structure

```
assets/
├── images/          # Images and graphics
├── icons/           # Icon files
├── fonts/           # Custom fonts (if any)
└── README.md        # This file
```

## Asset Guidelines

### Images
- Use WebP format for better compression
- Provide fallback formats (PNG/JPG)
- Optimize for mobile devices
- Maximum width: 1200px for hero images

### Icons
- Use SVG format when possible
- Provide PNG fallbacks for older browsers
- Follow consistent sizing (16px, 24px, 32px, 48px)
- Use FontAwesome for UI icons

### Fonts
- Use system fonts when possible for performance
- If custom fonts needed, use WOFF2 format
- Provide fallbacks for better compatibility

## Adding Assets

1. Place files in appropriate subdirectory
2. Update references in HTML/CSS files
3. Ensure proper optimization
4. Test on different devices and browsers

## Optimization

All assets should be optimized for web delivery:
- Images: Use tools like ImageOptim or TinyPNG
- SVGs: Use SVGO for optimization
- Fonts: Subset fonts to include only needed characters
