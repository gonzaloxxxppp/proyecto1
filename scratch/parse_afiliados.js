const fs = require('fs');
const path = require('path');

function cleanDni(val) {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

function cleanName(val) {
  if (!val) return '';
  return val.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ').trim();
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseFile() {
  const content = fs.readFileSync(path.join(__dirname, 'afiliados_raw.csv'), 'utf8');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  let currentSection = 'SUTIAGA';
  const sutiagaList = [];
  const mutualList = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line is the mutual header
    if (line.includes('APELLIDO Y NOMBRE 2') || line.includes('D.N.I.')) {
      currentSection = 'MUTUAL';
      continue;
    }
    if (i === 0 && line.includes('APELLIDO Y NOMBRE')) {
      continue; // Sutiaga header
    }

    const cols = parseCSVLine(line);
    if (!cols || cols.length < 2) continue;

    const rawName = cleanName(cols[0]);
    const rawDni = cleanDni(cols[1]);

    if (!rawName || !rawDni) {
      // Empty line or row without DNI
      continue;
    }

    const email = cols[2] && cols[2].includes('@') ? cols[2].trim() : '';

    // Extract familiares
    // Relatives typically start from col 3 onwards.
    // Let's inspect remaining columns:
    const familiares = [];
    let c = 3;
    while (c < cols.length) {
      const colVal1 = cleanName(cols[c]);
      const colVal2 = cols[c + 1] ? cleanName(cols[c + 1]) : '';

      if (colVal1) {
        // Check if colVal1 looks like a name and colVal2 looks like a DNI
        const dni1 = cleanDni(colVal1);
        const dni2 = cleanDni(colVal2);

        if (dni1.length >= 6 && isNaN(Number(colVal1)) === false && isNaN(Number(colVal2))) {
          // colVal1 is DNI, colVal2 is Name
          familiares.push({
            nombre: colVal2,
            dni: dni1,
            parentesco: 'Familiar'
          });
          c += 2;
        } else if (dni2.length >= 6 || (colVal2 && colVal2.includes('-'))) {
          // colVal1 is Name, colVal2 is DNI or Date
          familiares.push({
            nombre: colVal1,
            dni: dni2 || colVal2,
            parentesco: 'Familiar'
          });
          c += 2;
        } else if (colVal2) {
          // Both are strings or one is empty
          familiares.push({
            nombre: colVal1,
            dni: dni2 || '',
            parentesco: 'Familiar'
          });
          c += 2;
        } else {
          // Just colVal1 exists
          familiares.push({
            nombre: colVal1,
            dni: '',
            parentesco: 'Familiar'
          });
          c += 1;
        }
      } else {
        c++;
      }
    }

    const record = {
      nombre_completo: rawName,
      dni: rawDni,
      correo: email || `${rawDni}@afiliado.com`,
      contrasena: rawDni,
      familiares
    };

    if (currentSection === 'SUTIAGA') {
      sutiagaList.push(record);
    } else {
      mutualList.push(record);
    }
  }

  console.log(`Parsed SUTIAGA: ${sutiagaList.length} records`);
  console.log(`Parsed MUTUAL: ${mutualList.length} records`);

  // Merge logic
  const mergedMap = new Map();

  // Process SUTIAGA
  for (const s of sutiagaList) {
    mergedMap.set(s.dni, {
      ...s,
      organizacion: 'SUTIAGA',
      inSutiaga: true,
      inMutual: false
    });
  }

  // Process MUTUAL
  for (const m of mutualList) {
    if (mergedMap.has(m.dni)) {
      const existing = mergedMap.get(m.dni);
      existing.organizacion = 'AMBAS';
      existing.inMutual = true;

      // Merge familiares avoiding duplicate DNIs
      const famDnis = new Set(existing.familiares.map(f => f.dni).filter(d => d.length > 0));
      const famNames = new Set(existing.familiares.map(f => f.nombre.toLowerCase()));

      for (const fam of m.familiares) {
        const hasDni = fam.dni && famDnis.has(fam.dni);
        const hasName = fam.nombre && famNames.has(fam.nombre.toLowerCase());
        if (!hasDni && !hasName) {
          existing.familiares.push(fam);
          if (fam.dni) famDnis.add(fam.dni);
          if (fam.nombre) famNames.add(fam.nombre.toLowerCase());
        }
      }
    } else {
      mergedMap.set(m.dni, {
        ...m,
        organizacion: 'MUTUAL',
        inSutiaga: false,
        inMutual: true
      });
    }
  }

  const finalAfiliados = Array.from(mergedMap.values());
  const ambasCount = finalAfiliados.filter(a => a.organizacion === 'AMBAS').length;
  const sutiagaOnlyCount = finalAfiliados.filter(a => a.organizacion === 'SUTIAGA').length;
  const mutualOnlyCount = finalAfiliados.filter(a => a.organizacion === 'MUTUAL').length;

  console.log(`\n--- RESUMEN ---`);
  console.log(`Total afiliados únicos: ${finalAfiliados.length}`);
  console.log(`Solo SUTIAGA: ${sutiagaOnlyCount}`);
  console.log(`Solo MUTUAL: ${mutualOnlyCount}`);
  console.log(`En AMBAS organizaciones: ${ambasCount}`);

  // Print sample records
  console.log(`\nSample AMBAS:`);
  finalAfiliados.filter(a => a.organizacion === 'AMBAS').slice(0, 3).forEach(a => {
    console.log(`${a.dni} - ${a.nombre_completo} [${a.organizacion}] (Familiares: ${a.familiares.length})`);
  });

  return finalAfiliados;
}

parseFile();
