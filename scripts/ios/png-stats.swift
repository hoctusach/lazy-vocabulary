// Usage: swift scripts/ios/png-stats.swift shot.png  -> prints "dominant=<fraction> colors=<n>"; exit 1 when the screen looks blank
// (one colour covers > 92 % of the sampled pixels: white screen, solid splash, ...).
import Foundation
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count > 1,
      let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("cannot read image"); exit(2) }
let w = img.width, h = img.height
var data = [UInt8](repeating: 0, count: w * h * 4)
let ctx = CGContext(data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
var counts = [UInt32: Int]()
var total = 0
var y = 0
while y < h {
    var x = 0
    while x < w {
        let i = (y * w + x) * 4
        let key = (UInt32(data[i] >> 3) << 10) | (UInt32(data[i + 1] >> 3) << 5) | UInt32(data[i + 2] >> 3)
        counts[key, default: 0] += 1
        total += 1
        x += 4
    }
    y += 4
}
let dominant = Double(counts.values.max() ?? 0) / Double(max(total, 1))
print(String(format: "dominant=%.3f colors=%d size=%dx%d", dominant, counts.count, w, h))
exit(dominant > 0.92 ? 1 : 0)
