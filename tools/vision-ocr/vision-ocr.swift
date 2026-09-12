// vision-ocr — macOS の Vision で画像を OCR し、行ごとの文字と枠を JSON で出す。
//
// クラウドを使わずに、行の位置つきの OCR を得るための道具。
// TEI Scanner (github.com/nakamura196/tei-scanner) と同じ Vision の API
// (VNRecognizeTextRequest, accurate) を使うので、結果の性質も同じ。
//
// 組み立て:
//   swiftc -O tools/vision-ocr/vision-ocr.swift -o tools/vision-ocr/vision-ocr
//
// 使い方:
//   vision-ocr [--lang auto|en,fr,de|...] [--level accurate|fast] <画像> ...
//
// 出力は 1 画像 1 行の JSON (JSON Lines)。座標は画像の画素・左上原点。
//   {"file":"0001.jpg","width":6236,"height":4590,
//    "lines":[{"t":"THE RISE","x":10,"y":20,"w":100,"h":30,"confidence":0.99}, ...]}
//
// Vision の座標は正規化 (0–1)・左下原点なので、画素・左上原点に直してある。

import Foundation
import Vision
import ImageIO
import CoreGraphics

struct Line: Codable {
    let t: String
    let x: Int
    let y: Int
    let w: Int
    let h: Int
    let confidence: Double
}

struct PageResult: Codable {
    let file: String
    let width: Int
    let height: Int
    let lines: [Line]
    let error: String?
}

func imageSize(_ url: URL) -> (Int, Int)? {
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let w = props[kCGImagePropertyPixelWidth] as? Int,
          let h = props[kCGImagePropertyPixelHeight] as? Int else { return nil }
    return (w, h)
}

/// 行を読む順に並べる。
///
/// モリソンの画像は見開き (1 枚に 2 ページ) のものが多い。単純に上から下へ
/// 並べると左右のページの行が交互に混ざり、文章として読めなくなる。
/// 横長の画像は左半分・右半分に分け、左を読み切ってから右に移る。
func ordered(_ lines: [Line], width: Int, height: Int, columns: String) -> [Line] {
    let twoUp = (columns == "2") || (columns == "auto" && width > height)
    if !twoUp {
        return lines.sorted { ($0.y, $0.x) < ($1.y, $1.x) }
    }
    let mid = width / 2
    let left = lines.filter { ($0.x + $0.w / 2) < mid }.sorted { ($0.y, $0.x) < ($1.y, $1.x) }
    let right = lines.filter { ($0.x + $0.w / 2) >= mid }.sorted { ($0.y, $0.x) < ($1.y, $1.x) }
    return left + right
}

func recognize(url: URL, languages: [String], level: VNRequestTextRecognitionLevel,
               columns: String) -> PageResult {
    let name = url.lastPathComponent
    guard let (width, height) = imageSize(url) else {
        return PageResult(file: name, width: 0, height: 0, lines: [], error: "画像の大きさが読めません")
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = level
    request.usesLanguageCorrection = true
    if languages.isEmpty {
        request.automaticallyDetectsLanguage = true
    } else {
        request.recognitionLanguages = languages
    }
    let handler = VNImageRequestHandler(url: url, options: [:])
    do {
        try handler.perform([request])
    } catch {
        return PageResult(file: name, width: width, height: height, lines: [],
                          error: "OCR に失敗: \(error.localizedDescription)")
    }
    let observations = request.results ?? []
    var lines: [Line] = []
    for obs in observations {
        guard let candidate = obs.topCandidates(1).first else { continue }
        let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { continue }
        let bb = obs.boundingBox          // 正規化・左下原点
        let x = Int((bb.minX * CGFloat(width)).rounded())
        let y = Int(((1.0 - bb.maxY) * CGFloat(height)).rounded())
        let w = Int((bb.width * CGFloat(width)).rounded())
        let h = Int((bb.height * CGFloat(height)).rounded())
        lines.append(Line(t: text, x: max(0, x), y: max(0, y), w: max(1, w), h: max(1, h),
                          confidence: Double(candidate.confidence)))
    }
    lines = ordered(lines, width: width, height: height, columns: columns)
    return PageResult(file: name, width: width, height: height, lines: lines, error: nil)
}

// ── 引数 ──
var languages: [String] = []
var level: VNRequestTextRecognitionLevel = .accurate
var columns = "auto"     // auto | 1 | 2  (見開きを左右に分けるか)
var files: [String] = []
var args = Array(CommandLine.arguments.dropFirst())
while let arg = args.first {
    args.removeFirst()
    switch arg {
    case "--lang":
        let value = args.first ?? "auto"
        args.removeFirst()
        languages = (value == "auto") ? [] : value.split(separator: ",").map(String.init)
    case "--level":
        let value = args.first ?? "accurate"
        args.removeFirst()
        level = (value == "fast") ? .fast : .accurate
    case "--columns":
        columns = args.first ?? "auto"
        args.removeFirst()
    case "--help", "-h":
        print("使い方: vision-ocr [--lang auto|en,fr,de] [--level accurate|fast] [--columns auto|1|2] <画像> ...")
        exit(0)
    default:
        files.append(arg)
    }
}
if files.isEmpty {
    FileHandle.standardError.write("画像が指定されていません\n".data(using: .utf8)!)
    exit(2)
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]
for path in files {
    let result = recognize(url: URL(fileURLWithPath: path), languages: languages, level: level,
                           columns: columns)
    if let data = try? encoder.encode(result), let json = String(data: data, encoding: .utf8) {
        print(json)
        fflush(stdout)
    }
}
