// Erzeugt das Hintergrundbild für das EasyKitchen-Installationsfenster (DMG):
// App links → Pfeil → Programme-Ordner rechts, mit kurzer Anleitung (Deutsch & Englisch).
// Aufruf: swift dmg_background.swift <ausgabe.png> <skalierung 1|2>
import AppKit

let args = CommandLine.arguments
let out = args.count > 1 ? args[1] : "background.png"
let scale = CGFloat(Double(args.count > 2 ? args[2] : "1") ?? 1)
let W: CGFloat = 640, H: CGFloat = 400

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W * scale), pixelsHigh: Int(H * scale),
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: W, height: H)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

// Hintergrund: sanfter Verlauf (Grün → Lavendel), passend zum App-Design
let grad = NSGradient(colors: [NSColor(calibratedRed: 0.89, green: 0.96, blue: 0.92, alpha: 1),
                               NSColor(calibratedRed: 0.95, green: 0.93, blue: 0.99, alpha: 1)])!
grad.draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: -20)

func text(_ s: String, size: CGFloat, weight: NSFont.Weight, color: NSColor, y: CGFloat) {
    let p = NSMutableParagraphStyle(); p.alignment = .center
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .paragraphStyle: p]
    NSAttributedString(string: s, attributes: attrs).draw(in: NSRect(x: 0, y: y, width: W, height: size * 1.5))
}

let green = NSColor(calibratedRed: 0.17, green: 0.48, blue: 0.32, alpha: 1)
text("EasyKitchen installieren", size: 22, weight: .bold, color: NSColor(calibratedWhite: 0.16, alpha: 1), y: H - 62)
text("Ziehe EasyKitchen auf den Ordner „Applications“", size: 14, weight: .medium, color: green, y: H - 92)
text("Drag EasyKitchen onto the “Applications” folder", size: 12, weight: .regular, color: NSColor(calibratedWhite: 0.42, alpha: 1), y: H - 112)

// Pfeil zwischen den Symbolen (Symbole bei x=170 und x=470, Mitte y=190 von oben)
let cy = H - 190
let arrow = NSBezierPath()
arrow.lineWidth = 6
arrow.lineCapStyle = .round
arrow.lineJoinStyle = .round
arrow.move(to: NSPoint(x: 258, y: cy))
arrow.line(to: NSPoint(x: 378, y: cy))
arrow.move(to: NSPoint(x: 358, y: cy + 18))
arrow.line(to: NSPoint(x: 380, y: cy))
arrow.line(to: NSPoint(x: 358, y: cy - 18))
green.withAlphaComponent(0.85).setStroke()
arrow.stroke()

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
