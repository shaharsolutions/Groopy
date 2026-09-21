import JSZip from 'jszip';
import * as XLSX from 'xlsx';

/**
 * Normalizes relative paths within a ZIP archive.
 * E.g., baseDir: 'xl/drawings', relativePath: '../media/image1.png' -> 'xl/media/image1.png'
 */
function resolveZipPath(baseDir, relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('/')) return relativePath.slice(1);
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const parts = relativePath.split('/');
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Determines the image MIME type from binary headers or file extension.
 */
function getMimeType(filename, bytes) {
  if (bytes && bytes.length >= 4) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'image/bmp';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
  }
  const ext = (filename || '').split('.').pop().toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    default: return 'image/png';
  }
}

/**
 * Safely converts a Uint8Array into a Base64 string in any browser environment.
 */
function uint8ToBase64(uint8) {
  let binary = '';
  const len = uint8.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Concatenates multiple Uint8Arrays into one.
 */
function concatUint8Arrays(arrays) {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Checks if a string looks like a direct image URL or Firebase storage URL.
 */
export function isImageUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (/^data:image\/[a-zA-Z+]+;base64,/i.test(trimmed)) return true;
  if (/^https?:\/\/.+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?.*)?$/i.test(trimmed)) return true;
  if (/^https?:\/\/firebasestorage\.googleapis\.com\/.*$/i.test(trimmed) && 
      (/\.(?:png|jpe?g|gif|webp|svg|bmp)/i.test(trimmed) || /alt=media/i.test(trimmed))) return true;
  return false;
}

/**
 * Parses BIFF8 Escher records from a byte buffer.
 */
function parseEscherRecords(buf, start = 0, maxLen = buf.length) {
  const records = [];
  const bufView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = start;
  const end = Math.min(start + maxLen, buf.length);
  while (pos + 8 <= end) {
    const verInst = bufView.getUint16(pos, true);
    const recVer = verInst & 0x0F;
    const recInstance = verInst >> 4;
    const recType = bufView.getUint16(pos + 2, true);
    const recLen = bufView.getUint32(pos + 4, true);
    const isContainer = (recVer === 0x0F);
    const recData = buf.subarray(pos + 8, Math.min(pos + 8 + recLen, end));
    records.push({ pos, recVer, recInstance, recType, recLen, isContainer, data: recData });
    pos += 8 + recLen;
  }
  return records;
}

/**
 * Extracts raw image data and MIME type from an Escher BLIP record data.
 */
function extractBlipImage(blipData, recType) {
  for (let j = 0; j < Math.min(100, blipData.length - 4); j++) {
    if (blipData[j] === 0x89 && blipData[j+1] === 0x50 && blipData[j+2] === 0x4E && blipData[j+3] === 0x47) {
      return { data: blipData.subarray(j), mime: 'image/png' };
    }
    if (blipData[j] === 0xFF && blipData[j+1] === 0xD8 && blipData[j+2] === 0xFF) {
      return { data: blipData.subarray(j), mime: 'image/jpeg' };
    }
    if (blipData[j] === 0x47 && blipData[j+1] === 0x49 && blipData[j+2] === 0x46) {
      return { data: blipData.subarray(j), mime: 'image/gif' };
    }
    if (blipData[j] === 0x42 && blipData[j+1] === 0x4D) {
      return { data: blipData.subarray(j), mime: 'image/bmp' };
    }
  }
  if (blipData.length > 17) {
    const mime = (recType === 0xF01D) ? 'image/png' : 'image/jpeg';
    return { data: blipData.subarray(17), mime };
  }
  return null;
}

/**
 * Extracts images from a legacy Excel BIFF8 (.xls) file using SheetJS CFB and Escher parsing.
 */
function parseBiff8Images(arrayBuffer, sheetNames = []) {
  const result = {
    sheets: {},
    unanchored: []
  };
  sheetNames.forEach((sName) => {
    result.sheets[sName] = {};
  });

  let cfb;
  try {
    const cfbLib = XLSX.CFB;
    if (!cfbLib) return result;
    cfb = cfbLib.read(new Uint8Array(arrayBuffer), { type: 'array' });
  } catch {
    return result;
  }

  const cfbLib = XLSX.CFB;
  const wbEntry = cfbLib.find(cfb, 'Workbook') || 
                  cfbLib.find(cfb, 'Root Entry/Workbook') ||
                  cfbLib.find(cfb, 'Book') ||
                  cfbLib.find(cfb, 'Root Entry/Book');
  if (!wbEntry || !wbEntry.content) return result;

  const data = new Uint8Array(wbEntry.content);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  function readRecord(startOffset) {
    const opcode = view.getUint16(startOffset, true);
    const len = view.getUint16(startOffset + 2, true);
    const chunks = [data.subarray(startOffset + 4, startOffset + 4 + len)];
    let curr = startOffset + 4 + len;
    while (curr < data.length - 4 && view.getUint16(curr, true) === 0x003C) {
      const contLen = view.getUint16(curr + 2, true);
      chunks.push(data.subarray(curr + 4, curr + 4 + contLen));
      curr += 4 + contLen;
    }
    return { opcode, data: concatUint8Arrays(chunks), nextOffset: curr };
  }

  let offset = 0;
  const blipImages = [];
  const referencedPibs = new Set();
  const sheetDrawings = [];
  let currentSheetIdx = -1;

  while (offset < data.length - 4) {
    const opcode = view.getUint16(offset, true);
    const rec = readRecord(offset);
    offset = rec.nextOffset;

    if (opcode === 0x0809) {
      // BOF (Beginning of Substream)
      if (rec.data.length >= 4) {
        const recView = new DataView(rec.data.buffer, rec.data.byteOffset, rec.data.byteLength);
        const dt = recView.getUint16(2, true);
        if (dt === 0x0010) { // Worksheet substream
          currentSheetIdx++;
          sheetDrawings[currentSheetIdx] = [];
        }
      }
    } else if (opcode === 0x00EB) {
      // MSODRAWINGGROUP (Contains BstoreContainer with BLIP images)
      try {
        const dggRecs = parseEscherRecords(rec.data);
        const dggCont = dggRecs.find(r => r.recType === 0xF000);
        if (dggCont) {
          const innerRecs = parseEscherRecords(dggCont.data);
          const bstore = innerRecs.find(r => r.recType === 0xF001);
          if (bstore) {
            const bseRecs = parseEscherRecords(bstore.data);
            bseRecs.forEach((bse) => {
              if (bse.recType === 0xF007 && bse.data.length > 36) {
                const subBlips = parseEscherRecords(bse.data, 36, bse.recLen - 36);
                if (subBlips.length > 0) {
                  const blip = subBlips[0];
                  const img = extractBlipImage(blip.data, blip.recType);
                  if (img) {
                    const b64 = uint8ToBase64(img.data);
                    blipImages.push({
                      url: `data:${img.mime};base64,${b64}`,
                      mime: img.mime
                    });
                  } else {
                    blipImages.push(null);
                  }
                } else {
                  blipImages.push(null);
                }
              }
            });
          }
        }
      } catch {
        // Ignore MSODRAWINGGROUP error
      }
    } else if (opcode === 0x00EC) {
      // MSODRAWING (Worksheet shapes & ClientAnchor)
      const targetIdx = currentSheetIdx >= 0 ? currentSheetIdx : 0;
      if (!sheetDrawings[targetIdx]) sheetDrawings[targetIdx] = [];

      try {
        const topRecs = parseEscherRecords(rec.data);
        function findSpContainers(recs) {
          let res = [];
          for (const r of recs) {
            if (r.recType === 0xF004) res.push(r);
            if (r.isContainer && r.data.length > 0) {
              res = res.concat(findSpContainers(parseEscherRecords(r.data)));
            }
          }
          return res;
        }
        const spContainers = findSpContainers(topRecs);
        for (const sp of spContainers) {
          const subRecs = parseEscherRecords(sp.data);
          let pib = null;
          let anchor = null;
          for (const sr of subRecs) {
            if (sr.recType === 0xF00B) { // Opt
              const srView = new DataView(sr.data.buffer, sr.data.byteOffset, sr.data.byteLength);
              for (let p = 0; p + 6 <= sr.data.length; p += 6) {
                const pid = srView.getUint16(p, true) & 0x3FFF;
                if (pid === 0x0104) { // pib
                  pib = srView.getUint32(p + 2, true);
                }
              }
            } else if (sr.recType === 0xF010) { // ClientAnchor
              if (sr.data.length >= 8) {
                const srView = new DataView(sr.data.buffer, sr.data.byteOffset, sr.data.byteLength);
                const col1 = srView.getUint16(2, true);
                const row1 = srView.getUint16(6, true);
                anchor = { col: col1, row: row1 };
              }
            }
          }
          if (pib && anchor) {
            sheetDrawings[targetIdx].push({ pib, ...anchor });
            referencedPibs.add(pib);
          }
        }
      } catch {
        // Ignore MSODRAWING parse error
      }
    }
  }

  // Map sheet drawings to cells
  sheetDrawings.forEach((shapes, sIdx) => {
    const sName = sheetNames[sIdx] || (sIdx === 0 && sheetNames.length > 0 ? sheetNames[0] : `Sheet${sIdx + 1}`);
    if (!result.sheets[sName]) result.sheets[sName] = {};

    shapes.forEach((s) => {
      const blip = blipImages[s.pib - 1];
      if (blip) {
        const key = `${s.row}_${s.col}`;
        if (!result.sheets[sName][key]) result.sheets[sName][key] = [];
        result.sheets[sName][key].push({
          url: blip.url,
          name: `תמונה (שורה ${s.row + 1}, עמודה ${s.col + 1})`
        });
      }
    });
  });

  // Collect unreferenced blips
  blipImages.forEach((blip, idx) => {
    const pib = idx + 1;
    if (blip && !referencedPibs.has(pib)) {
      result.unanchored.push({
        url: blip.url,
        name: `תמונה ${pib}`
      });
    }
  });

  return result;
}

/**
 * Extracts all embedded images and image URLs from an Excel workbook (.xlsx / .xls).
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer - The raw file buffer
 * @param {object} workbook - The SheetJS parsed workbook object
 * @returns {Promise<{ sheets: Record<string, Record<string, Array<{ url: string, name: string }>>>, unanchored: Array<{ url: string, name: string }> }>}
 */
export async function extractAllImagesFromExcel(arrayBuffer, workbook) {
  const result = {
    sheets: {}, // sheetName -> { 'row_col': [ { url, name } ] }
    unanchored: [] // [ { url, name } ]
  };

  const sheetNames = workbook?.SheetNames || [];
  sheetNames.forEach((name) => {
    result.sheets[name] = {};
  });

  if (!arrayBuffer) return result;

  const uint8View = new Uint8Array(arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer.buffer || arrayBuffer);

  // 1. Check if buffer is an OpenXML ZIP (.xlsx) file (PK header: 0x50, 0x4B)
  const isZip = uint8View.length >= 4 && uint8View[0] === 0x50 && uint8View[1] === 0x4B;

  // 2. Check if buffer is a legacy OLE CFB (.xls) file (Header: 0xD0, 0xCF, 0x11, 0xE0)
  const isCfb = uint8View.length >= 4 && uint8View[0] === 0xD0 && uint8View[1] === 0xCF && uint8View[2] === 0x11 && uint8View[3] === 0xE0;

  if (isCfb) {
    try {
      const biff8Result = parseBiff8Images(arrayBuffer, sheetNames);
      if (biff8Result) {
        Object.keys(biff8Result.sheets || {}).forEach((sName) => {
          result.sheets[sName] = { ...(result.sheets[sName] || {}), ...(biff8Result.sheets[sName] || {}) };
        });
        result.unanchored = result.unanchored.concat(biff8Result.unanchored || []);
      }
    } catch (biffErr) {
      console.warn('Failed to parse BIFF8 (.xls) images:', biffErr);
    }
  }

  let zip = null;
  if (isZip) {
    try {
      zip = await JSZip.loadAsync(arrayBuffer);
    } catch (zipErr) {
      console.warn('Failed to parse Excel ZIP structure:', zipErr);
    }
  }

  const allMediaFiles = new Set();
  const matchedMediaPaths = new Set();

  if (zip) {
    // 1. Catalog all media files in the archive
    zip.forEach((relPath) => {
      if (/^xl\/media\//i.test(relPath) && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(relPath)) {
        allMediaFiles.add(relPath);
      }
    });

    // 2. Map sheet names to sheet XML files in xl/worksheets/
    const sheetNameToXml = {};
    try {
      const wbXml = await zip.file('xl/workbook.xml')?.async('text');
      const wbRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
      const wbRelMap = {};
      if (wbRels) {
        const relRegex = /<Relationship[^>]+Id=["']([^"']+)["'][^>]+Target=["']([^"']+)["']/gi;
        let m;
        while ((m = relRegex.exec(wbRels)) !== null) {
          wbRelMap[m[1]] = resolveZipPath('xl', m[2]);
        }
      }
      if (wbXml) {
        const sRegex = /<sheet[^>]+name=["']([^"']+)["'][^>]+r:id=["']([^"']+)["']/gi;
        let m;
        while ((m = sRegex.exec(wbXml)) !== null) {
          const sName = m[1];
          const rId = m[2];
          if (wbRelMap[rId]) {
            sheetNameToXml[sName] = wbRelMap[rId];
          }
        }
      }
    } catch (e) {
      console.warn('Error reading workbook relationships:', e);
    }

    // Fallback: match remaining sheets by index
    sheetNames.forEach((sName, i) => {
      if (!sheetNameToXml[sName]) {
        sheetNameToXml[sName] = `xl/worksheets/sheet${i + 1}.xml`;
      }
    });

    // 3. Extract OpenXML drawings for each sheet
    for (const [sheetName, sheetXmlPath] of Object.entries(sheetNameToXml)) {
      if (!result.sheets[sheetName]) result.sheets[sheetName] = {};

      try {
        const sheetXml = await zip.file(sheetXmlPath)?.async('text');
        if (!sheetXml) continue;

        const sParts = sheetXmlPath.split('/');
        const sFileName = sParts.pop();
        const sDir = sParts.join('/');
        const sRelsPath = `${sDir}/_rels/${sFileName}.rels`;
        const sRels = await zip.file(sRelsPath)?.async('text');

        const drawingRelMap = {};
        if (sRels) {
          const relRegex = /<Relationship[^>]+Id=["']([^"']+)["'][^>]+Target=["']([^"']+)["']/gi;
          let m;
          while ((m = relRegex.exec(sRels)) !== null) {
            drawingRelMap[m[1]] = resolveZipPath(sDir, m[2]);
          }
        }

        // Find drawing IDs in sheetXml
        const drawingPaths = [];
        const dRegex = /<(?:xdr:)?(?:drawing|legacyDrawing)[^>]+r:id=["']([^"']+)["']/gi;
        let dm;
        while ((dm = dRegex.exec(sheetXml)) !== null) {
          const target = drawingRelMap[dm[1]];
          if (target) drawingPaths.push(target);
        }

        // Fallback: check conventional drawing path if none explicitly listed
        if (drawingPaths.length === 0) {
          const idx = sheetNames.indexOf(sheetName);
          const conventionalPath = `xl/drawings/drawing${idx + 1}.xml`;
          if (zip.file(conventionalPath)) drawingPaths.push(conventionalPath);
        }

        for (const dPath of drawingPaths) {
          const dXml = await zip.file(dPath)?.async('text');
          if (!dXml) continue;

          const dParts = dPath.split('/');
          const dFileName = dParts.pop();
          const dDir = dParts.join('/');
          const dRelsPath = `${dDir}/_rels/${dFileName}.rels`;
          const dRels = await zip.file(dRelsPath)?.async('text');

          const imageRelMap = {};
          if (dRels) {
            const relRegex = /<Relationship[^>]+Id=["']([^"']+)["'][^>]+Target=["']([^"']+)["']/gi;
            let m;
            while ((m = relRegex.exec(dRels)) !== null) {
              imageRelMap[m[1]] = resolveZipPath(dDir, m[2]);
            }
          }

          // Parse anchors: twoCellAnchor and oneCellAnchor
          const anchorRegex = /<xdr:(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/gi;
          let am;
          while ((am = anchorRegex.exec(dXml)) !== null) {
            const content = am[2];
            const fromMatch = content.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/i);
            if (!fromMatch) continue;
            const col = parseInt(fromMatch[1], 10);
            const row = parseInt(fromMatch[2], 10);

            const blipMatch = content.match(/<a:blip[^>]+(?:r:embed|r:link)=["']([^"']+)["']/i);
            if (!blipMatch) continue;
            const rId = blipMatch[1];
            const imgPath = imageRelMap[rId];
            if (!imgPath) continue;

            const imgFile = zip.file(imgPath);
            if (imgFile) {
              matchedMediaPaths.add(imgPath);
              const uint8 = await imgFile.async('uint8array');
              const mime = getMimeType(imgPath, uint8);
              const base64 = await imgFile.async('base64');
              const dataUrl = `data:${mime};base64,${base64}`;

              const nameMatch = content.match(/<xdr:cNvPr[^>]+(?:name|descr|title)=["']([^"']+)["']/i);
              const imgName = nameMatch ? nameMatch[1] : '';

              const key = `${row}_${col}`;
              if (!result.sheets[sheetName][key]) result.sheets[sheetName][key] = [];
              result.sheets[sheetName][key].push({
                url: dataUrl,
                name: imgName || 'תמונה'
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Error extracting drawings for sheet ${sheetName}:`, err);
      }
    }

    // 4. Extract WPS Office & Cell Images (xl/cellimages.xml)
    try {
      const cellImagesXml = await zip.file('xl/cellimages.xml')?.async('text');
      if (cellImagesXml) {
        const cellRelsXml = await zip.file('xl/_rels/cellimages.xml.rels')?.async('text');
        const cellRelMap = {};
        if (cellRelsXml) {
          const relRegex = /<Relationship[^>]+Id=["']([^"']+)["'][^>]+Target=["']([^"']+)["']/gi;
          let m;
          while ((m = relRegex.exec(cellRelsXml)) !== null) {
            cellRelMap[m[1]] = resolveZipPath('xl', m[2]);
          }
        }

        const cellImgMap = {}; // imageId -> { url, name }
        const picRegex = /<xdr:pic>([\s\S]*?)<\/xdr:pic>/gi;
        let pm;
        while ((pm = picRegex.exec(cellImagesXml)) !== null) {
          const picXml = pm[1];
          const nameMatch = picXml.match(/<xdr:cNvPr[^>]+name=["']([^"']+)["']/i);
          const blipMatch = picXml.match(/<a:blip[^>]+r:embed=["']([^"']+)["']/i);
          if (nameMatch && blipMatch) {
            const id = nameMatch[1];
            const rId = blipMatch[1];
            const target = cellRelMap[rId];
            if (target) {
              const imgFile = zip.file(target);
              if (imgFile) {
                matchedMediaPaths.add(target);
                const uint8 = await imgFile.async('uint8array');
                const mime = getMimeType(target, uint8);
                const b64 = await imgFile.async('base64');
                cellImgMap[id] = {
                  url: `data:${mime};base64,${b64}`,
                  name: 'תמונה'
                };
              }
            }
          }
        }

        // Match cellImgMap IDs against worksheet cell values/formulas
        const cellImgIds = Object.keys(cellImgMap);
        if (cellImgIds.length > 0 && workbook?.Sheets) {
          sheetNames.forEach((sName) => {
            const ws = workbook.Sheets[sName];
            if (!ws) return;
            Object.keys(ws).forEach((cellRef) => {
              if (cellRef.startsWith('!')) return;
              const cell = ws[cellRef];
              if (!cell) return;
              const cellStr = `${cell.f || ''} ${cell.v || ''} ${cell.w || ''}`;
              for (const id of cellImgIds) {
                if (cellStr.includes(id)) {
                  try {
                    const { r, c } = XLSX.utils.decode_cell(cellRef);
                    const key = `${r}_${c}`;
                    if (!result.sheets[sName][key]) result.sheets[sName][key] = [];
                    result.sheets[sName][key].push(cellImgMap[id]);
                  } catch {
                    // Ignore cell decode error
                  }
                  break;
                }
              }
            });
          });
        }
      }
    } catch (wpsErr) {
      console.warn('Error reading cellimages.xml:', wpsErr);
    }

    // 5. Extract Excel 365 In-Cell Images (Rich Data)
    try {
      const richValRelXml = await zip.file('xl/richData/richValueRel.xml')?.async('text');
      const richRelsXml = await zip.file('xl/richData/_rels/richValueRel.xml.rels')?.async('text');
      if (richValRelXml && richRelsXml) {
        const richRelMap = {};
        const relRegex = /<Relationship[^>]+Id=["']([^"']+)["'][^>]+Target=["']([^"']+)["']/gi;
        let m;
        while ((m = relRegex.exec(richRelsXml)) !== null) {
          richRelMap[m[1]] = resolveZipPath('xl/richData', m[2]);
        }

        const richValImages = [];
        const relTagRegex = /<rel[^>]+r:id=["']([^"']+)["']/gi;
        while ((m = relTagRegex.exec(richValRelXml)) !== null) {
          const target = richRelMap[m[1]];
          if (target) {
            const imgFile = zip.file(target);
            if (imgFile) {
              matchedMediaPaths.add(target);
              const uint8 = await imgFile.async('uint8array');
              const mime = getMimeType(target, uint8);
              const b64 = await imgFile.async('base64');
              richValImages.push({
                url: `data:${mime};base64,${b64}`,
                name: 'תמונת תא'
              });
            } else {
              richValImages.push(null);
            }
          } else {
            richValImages.push(null);
          }
        }

        // Parse metadata to map vm index to richValImages
        const metaXml = await zip.file('xl/metadata.xml')?.async('text');
        const vmToRichIdx = []; // 1-based index in vm
        if (metaXml) {
          const bkRegex = /<bk[^>]*>([\s\S]*?)<\/bk>/gi;
          while ((m = bkRegex.exec(metaXml)) !== null) {
            const rcMatch = m[1].match(/<rc[^>]+v=["'](\d+)["']/i);
            vmToRichIdx.push(rcMatch ? parseInt(rcMatch[1], 10) : null);
          }
        }

        // Map cells with vm attribute in each sheet
        for (const [sName, sXmlPath] of Object.entries(sheetNameToXml)) {
          const sXml = await zip.file(sXmlPath)?.async('text');
          if (!sXml) continue;
          const cellVmRegex = /<c\s+r=["']([A-Z]+[0-9]+)["'][^>]*\svm=["'](\d+)["']/gi;
          while ((m = cellVmRegex.exec(sXml)) !== null) {
            const cellRef = m[1];
            const vmIdx = parseInt(m[2], 10);
            const richIdx = vmToRichIdx[vmIdx - 1];
            if (richIdx != null && richValImages[richIdx]) {
              try {
                const { r, c } = XLSX.utils.decode_cell(cellRef);
                const key = `${r}_${c}`;
                if (!result.sheets[sName][key]) result.sheets[sName][key] = [];
                result.sheets[sName][key].push(richValImages[richIdx]);
              } catch {
                // Ignore cell decode error
              }
            }
          }
        }
      }
    } catch (richErr) {
      console.warn('Error reading richData images:', richErr);
    }

    // 6. Gather unanchored media files (if any images exist in xl/media/ but weren't linked to a cell)
    for (const mediaPath of allMediaFiles) {
      if (!matchedMediaPaths.has(mediaPath)) {
        try {
          const imgFile = zip.file(mediaPath);
          if (imgFile) {
            const uint8 = await imgFile.async('uint8array');
            const mime = getMimeType(mediaPath, uint8);
            const b64 = await imgFile.async('base64');
            const fileName = mediaPath.split('/').pop() || 'תמונה נוספת';
            result.unanchored.push({
              url: `data:${mime};base64,${b64}`,
              name: fileName
            });
          }
        } catch {
          // Ignore unanchored image read error
        }
      }
    }
  }

  // 7. Scan cell formulas, string values, and hyperlinks for image URLs (both .xlsx and .xls)
  if (workbook?.Sheets) {
    sheetNames.forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return;
      if (!result.sheets[sheetName]) result.sheets[sheetName] = {};

      Object.keys(ws).forEach((cellRef) => {
        if (cellRef.startsWith('!')) return;
        const cell = ws[cellRef];
        if (!cell) return;

        let decoded;
        try {
          decoded = XLSX.utils.decode_cell(cellRef);
        } catch {
          return;
        }
        const { r: row, c: col } = decoded;
        const key = `${row}_${col}`;

        // Check formula: =IMAGE("url")
        if (cell.f && typeof cell.f === 'string') {
          const formulaImgMatch = cell.f.match(/IMAGE\s*\(\s*["']([^"']+)["']/i);
          if (formulaImgMatch) {
            const url = formulaImgMatch[1].trim();
            if (url) {
              if (!result.sheets[sheetName][key]) result.sheets[sheetName][key] = [];
              if (!result.sheets[sheetName][key].some((img) => img.url === url)) {
                result.sheets[sheetName][key].push({
                  url,
                  name: 'תמונה (נוסחה)'
                });
              }
            }
          }
        }

        // Check string value: direct image URL or Base64
        const val = typeof cell.v === 'string' ? cell.v.trim() : (typeof cell.w === 'string' ? cell.w.trim() : '');
        if (val && isImageUrl(val)) {
          if (!result.sheets[sheetName][key]) result.sheets[sheetName][key] = [];
          if (!result.sheets[sheetName][key].some((img) => img.url === val)) {
            result.sheets[sheetName][key].push({
              url: val,
              name: 'תמונה מקושרת'
            });
          }
        }

        // Check hyperlink
        if (cell.l && cell.l.Target) {
          const link = cell.l.Target.trim();
          if (isImageUrl(link)) {
            if (!result.sheets[sheetName][key]) result.sheets[sheetName][key] = [];
            if (!result.sheets[sheetName][key].some((img) => img.url === link)) {
              result.sheets[sheetName][key].push({
                url: link,
                name: 'תמונה מקישור'
              });
            }
          }
        }
      });
    });
  }

  return result;
}
