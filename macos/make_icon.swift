// Erzeugt das EasyKitchen-App-Icon (AppIcon.iconset) mit AppKit nach Apple-HIG-Raster
// (824 px Körper auf 1024 px Canvas, 185 px Eckenradius).
// Verwendung: swift make_icon.swift <ausgabe.iconset> [png-128-pfad]
import Cocoa

let args = CommandLine.arguments
let outDir = args.count > 1 ? args[1] : "AppIcon.iconset"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

func renderIcon(size: Int) -> Data? {
    let s = CGFloat(size)
    guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
                                     bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                     colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { return nil }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    let k = s / 1024
    let rect = NSRect(x: 100 * k, y: 100 * k, width: 824 * k, height: 824 * k)
    let path = NSBezierPath(roundedRect: rect, xRadius: 185 * k, yRadius: 185 * k)

    // Schatten
    NSGraphicsContext.current?.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor(white: 0, alpha: 0.28)
    shadow.shadowBlurRadius = 18 * k
    shadow.shadowOffset = NSSize(width: 0, height: -6 * k)
    shadow.set()
    NSColor.white.setFill()
    path.fill()
    NSGraphicsContext.current?.restoreGraphicsState()

    // Warmer Verlauf (Tomate → Orange)
    let gradient = NSGradient(colors: [
        NSColor(red: 0.96, green: 0.42, blue: 0.29, alpha: 1),
        NSColor(red: 0.99, green: 0.67, blue: 0.30, alpha: 1)
    ])!
    gradient.draw(in: path, angle: 60)

    // Heller Teller
    NSGraphicsContext.current?.saveGraphicsState()
    path.addClip()
    let plateR = 300 * k
    let center = NSPoint(x: s / 2, y: s / 2 - 10 * k)
    let plate = NSBezierPath(ovalIn: NSRect(x: center.x - plateR, y: center.y - plateR, width: plateR * 2, height: plateR * 2))
    NSColor(white: 1, alpha: 0.95).setFill()
    plate.fill()
    let innerR = 230 * k
    let inner = NSBezierPath(ovalIn: NSRect(x: center.x - innerR, y: center.y - innerR, width: innerR * 2, height: innerR * 2))
    NSColor(red: 1, green: 0.95, blue: 0.9, alpha: 1).setFill()
    inner.fill()
    NSGraphicsContext.current?.restoreGraphicsState()

    // Pfanne / Essen
    let emoji = "🍳" as NSString
    let font = NSFont.systemFont(ofSize: 330 * k)
    let attrs: [NSAttributedString.Key: Any] = [.font: font]
    let ts = emoji.size(withAttributes: attrs)
    emoji.draw(at: NSPoint(x: (s - ts.width) / 2, y: center.y - ts.height / 2 + 6 * k), withAttributes: attrs)

    // Feine Kontur
    NSColor(white: 0, alpha: 0.08).setStroke()
    path.lineWidth = max(1, 2 * k)
    path.stroke()

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])
}

let specs: [(String, Int)] = [
    ("icon_16x16.png", 16), ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32), ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128), ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256), ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512), ("icon_512x512@2x.png", 1024)
]
for (name, size) in specs {
    if let data = renderIcon(size: size) {
        try? data.write(to: URL(fileURLWithPath: outDir).appendingPathComponent(name))
    }
}
if args.count > 2, let data = renderIcon(size: 128) {
    try? data.write(to: URL(fileURLWithPath: args[2]))
}
print("Iconset geschrieben: \(outDir)")
