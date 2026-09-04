import * as fs from 'fs'

const filePath = 'c:/Users/Zennn/Desktop/KONTRAKAN/Frontend/src/pages/Rooms.tsx'
const buf = fs.readFileSync(filePath)

let content = ''
if (buf[0] === 0xff && buf[1] === 0xfe) {
  content = buf.toString('utf16le')
} else {
  content = buf.toString('utf8')
}

// Clean any mojibake characters
content = content.replace(/ÔÜá´©Å/g, '')
content = content.replace(/\uFFFD/g, '')

// Ensure KTP Belum Ada and KK Belum Ada are clean
content = content.replace(
  /<span className="text-amber-700 bg-amber-50 px-2 py-0\.5 rounded text-\[11px\] font-medium border border-amber-200">\s*KTP Belum Ada\s*<\/span>/g,
  '<span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 flex items-center"><AlertTriangle className="w-3 h-3 mr-1 text-amber-600 inline shrink-0" /> KTP Belum Ada</span>'
)

content = content.replace(
  /<span className="text-amber-700 bg-amber-50 px-2 py-0\.5 rounded text-\[11px\] font-medium border border-amber-200">\s*KK Belum Ada\s*<\/span>/g,
  '<span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 flex items-center"><AlertTriangle className="w-3 h-3 mr-1 text-amber-600 inline shrink-0" /> KK Belum Ada</span>'
)

fs.writeFileSync(filePath, content, { encoding: 'utf8' })
console.log('Fixed Rooms.tsx cleanly to UTF-8!')
