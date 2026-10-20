const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yufhvklzfrbvxmmuejxh.supabase.co';
const supabaseKey = 'sb_publishable_DiOKi1h73L0oJT6bqejIGw_hWpEMcS9';
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function run() {
  const filePath = path.join(__dirname, 'afiliados_raw.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  let currentSection = 'SUTIAGA';
  const sutiagaList = [];
  const mutualList = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('APELLIDO Y NOMBRE 2') || line.includes('D.N.I.')) {
      currentSection = 'MUTUAL';
      continue;
    }
    if (i === 0 && line.includes('APELLIDO Y NOMBRE')) {
      continue;
    }

    const cols = parseCSVLine(line);
    if (!cols || cols.length < 2) continue;

    const rawName = cleanName(cols[0]);
    const rawDni = cleanDni(cols[1]);

    if (!rawName || !rawDni) {
      continue;
    }

    const email = cols[2] && cols[2].includes('@') ? cols[2].trim() : '';

    // Extract familiares
    const familiares = [];
    let c = 3;
    while (c < cols.length) {
      const colVal1 = cleanName(cols[c]);
      const colVal2 = cols[c + 1] ? cleanName(cols[c + 1]) : '';

      if (colVal1) {
        const dni1 = cleanDni(colVal1);
        const dni2 = cleanDni(colVal2);

        if (dni1.length >= 6 && !isNaN(Number(colVal1)) && isNaN(Number(colVal2))) {
          familiares.push({
            nombre: colVal2,
            dni: dni1,
            parentesco: 'Familiar'
          });
          c += 2;
        } else if (dni2.length >= 6 || (colVal2 && colVal2.includes('-'))) {
          familiares.push({
            nombre: colVal1,
            dni: dni2 || colVal2,
            parentesco: 'Familiar'
          });
          c += 2;
        } else if (colVal2) {
          familiares.push({
            nombre: colVal1,
            dni: dni2 || '',
            parentesco: 'Familiar'
          });
          c += 2;
        } else {
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

  // Merge SUTIAGA and MUTUAL
  const mergedMap = new Map();

  for (const s of sutiagaList) {
    mergedMap.set(s.dni, {
      ...s,
      organizacion: 'SUTIAGA',
      inSutiaga: true,
      inMutual: false
    });
  }

  for (const m of mutualList) {
    if (mergedMap.has(m.dni)) {
      const existing = mergedMap.get(m.dni);
      existing.organizacion = 'AMBAS';
      existing.inMutual = true;

      // Merge familiares
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

  const allRecords = Array.from(mergedMap.values()).map(r => ({
    dni: r.dni,
    nombre_completo: r.nombre_completo,
    correo: r.correo,
    contrasena: r.contrasena,
    organizacion: r.organizacion,
    familiares: r.familiares
  }));

  console.log(`\nSubiendo ${allRecords.length} afiliados a Supabase...`);
  console.log(`- SUTIAGA: ${allRecords.filter(a => a.organizacion === 'SUTIAGA').length}`);
  console.log(`- MUTUAL: ${allRecords.filter(a => a.organizacion === 'MUTUAL').length}`);
  console.log(`- AMBAS: ${allRecords.filter(a => a.organizacion === 'AMBAS').length}`);

  // Upsert in batches of 40
  const batchSize = 40;
  let inserted = 0;
  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    const { data, error } = await supabase.from('afiliados').upsert(batch, { onConflict: 'dni' });
    if (error) {
      console.error(`Error en lote ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Lote ${i / batchSize + 1} completado (${inserted}/${allRecords.length})`);
    }
  }

  console.log(`\n¡Carga completada con éxito! Total procesados: ${inserted}`);

  // Query database to verify final count
  const { data: finalDb, error: countErr } = await supabase.from('afiliados').select('dni, organizacion');
  if (finalDb) {
    console.log(`\nTotal actual en la Base de Datos: ${finalDb.length} afiliados.`);
    console.log(`- SUTIAGA en BD: ${finalDb.filter(a => a.organizacion === 'SUTIAGA').length}`);
    console.log(`- MUTUAL en BD: ${finalDb.filter(a => a.organizacion === 'MUTUAL').length}`);
    console.log(`- AMBAS en BD: ${finalDb.filter(a => a.organizacion === 'AMBAS').length}`);
  }
}

run();
