require("dotenv").config();
const oracledb = require("oracledb");
const fs = require("fs");
const csv = require("fast-csv");
const path = require("path");
const carpetaDestino = path.join(
  "C:",
  "Users",
  "avilche",
  "source",
  "repos",
  "Angular",
  "IVASIMPLE",
  "CSV"
);

oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_11" });

//oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function exportar_restitucion_credito_fiscal(empresa, desde, hasta) {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT
    });

    const query = `
     SELECT
    CONCEPTO,
    ALICUOTAIVA,
    SUM(IMP_NETO) AS IMPNETO,
    SUM(CREDITOFISCAL) AS CREDITOFISCAL
FROM (
       SELECT 
        CASE 
                WHEN B1_XACTF = 'S' THEN '4'

                WHEN B1_CONCGAN in ('06','04') THEN '1'

                WHEN B1_CONCGAN = '23' THEN '2'

                ELSE '3'

        END AS CONCEPTO,

        CASE
            WHEN D2_alqimp2 <>'0'  THEN '4'  --10.5
            WHEN d2_alqimp1 <> '0' THEN '5'  --21
            WHEN D2_alqimp3 <> '0' THEN '6'  --27
                     ELSE '3'
        END AS ALICUOTAIVA,

         CASE 
            WHEN F2.F2_MOEDA = '1' THEN D2_TOTAL
            ELSE (D2_TOTAL) * F2.f2_txmoeda
        END 
        AS IMP_NETO,

        CASE 
            WHEN F2.F2_MOEDA = '1' THEN 
                CASE 
            WHEN d2_alqimp2 <>'0'  THEN D2_VALIMP2
            WHEN d2_alqimp1 <> '0' THEN D2_VALIMP1  
            WHEN d2_alqimp3 <> '0' THEN D2_VALIMP3
                     ELSE 0
                END
            ELSE
                CASE 
            WHEN d2_alqimp2 <>'0'  THEN d2_VALIMP2 * f2_txmoeda
            WHEN d2_alqimp1 <> '0' THEN d2_VALIMP1 * f2_txmoeda  
            WHEN d2_alqimp3 <> '0' THEN d2_VALIMP3 * f2_txmoeda
                    ELSE 0
                END
        END AS CREDITOFISCAL

    FROM SF2010 F2
    
     INNER JOIN SD2010 d
        ON d.d2_doc = F2.f2_doc
       AND d.d2_filial = F2.f2_filial
       AND d.d2_especie = F2.f2_especie
       AND d.d2_serie = F2.f2_serie
       AND d.d2_emissao = f2.f2_emissao
       AND d.d2_cliente = f2.f2_cliente
       AND d.d_e_l_e_t_=' '
    
    LEFT JOIN SB1010 B
        ON d2_filial = B1_FILIAL
       AND B.D_E_L_E_T_ = ' '
       AND d2_cod = b.b1_cod
       
    LEFT JOIN SA2010 A2
        ON a2.a2_cod = F2.f2_cliente
       AND a2.a2_filial = F2.f2_filial
       AND A2.D_E_L_E_T_=' '
       
    LEFT JOIN SF4010 F4 ON F4.F4_CODIGO = D2_TES 
    AND F4.D_E_L_E_T_=' '
       
    WHERE F2.d_e_l_e_t_ = ' '
      AND F2.f2_especie in ('NCP')
      AND LPAD(F2.f2_filial, 2, '0')= :empresa
      AND F2.F2_dtdigit BETWEEN :desde AND :hasta
) Q
GROUP BY
    CONCEPTO,
    ALICUOTAIVA

`;

    const result = await connection.execute(
      query,
      {
        empresa,
        desde,
        hasta
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

console.log("Filas devueltas por Oracle:", result.rows.length);

function formatoAFIP(valor) {
  if (valor === null || valor === undefined || valor === 0) return 0;
  return valor.toString().replace(".", ",");
}

    if (!result.rows || result.rows.length === 0) {
      console.log("No hay datos para exportar.");
      return;
    }

const nombreArchivo = `RESTITUCION_CREDITO_FISCAL_${empresa}_${desde}_${hasta}.csv`;
const rutaArchivo = path.join(carpetaDestino, nombreArchivo);
const stream = fs.createWriteStream(rutaArchivo, { encoding: "utf8" });

const csvStream = csv.format({
  headers: false,
  delimiter: ";"
});

csvStream.pipe(stream);

csvStream.write({
  CONCEPTO: "CONCEPTO",
  CODIGO_ALICUOTA: "CODIGO DE ALÍCUOTA",
  IMPNETO: "MONTO NETO GRAVADO",
  CREDITO_FISCAL: "CRÉDITO FISCAL FACTURADO",
  FIN: ""
});

for (const fila of result.rows) {
  csvStream.write({
    CONCEPTO: fila.CONCEPTO,
    CODIGO_ALICUOTA: fila.ALICUOTAIVA,
    IMPNETO: formatoAFIP(fila.IMPNETO),
    CREDITO_FISCAL: formatoAFIP(fila.IMPNETO),
    FIN: ""
  });
}

csvStream.end();

await new Promise(resolve => stream.on("finish", resolve));

console.log("✅ CSV generado correctamente:", nombreArchivo);

    console.log("✅ CSV generado:", nombreArchivo);

  } catch (error) {
    console.error("❌ Error generando CSV:", error);
  } finally {
    if (connection) await connection.close();
  }
}


exportar_restitucion_credito_fiscal("01", "20251101", "20251130");


