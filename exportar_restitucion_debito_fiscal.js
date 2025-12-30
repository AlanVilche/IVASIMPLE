
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


async function exportar_restitucion_debito_fiscal(empresa, desde, hasta) {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT
    });

    const query = `
       SELECT
    CODIGOACT,
    tipoOperacion,
    CondicionFiscal,
    ALICUOTAIVA,
    SUM(IMP_NETO)
     AS IMPNETO,
    SUM(DebitoFiscal)
     AS DebitoFiscal,
    SUM(Exento)
    AS EXENTO
    
FROM (
    SELECT
        B1_ACTDEC AS CODIGOACT,
        
        CASE 
            WHEN 
                TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0
            --AND CL.CONDICIONIVA <>'8'  
       THEN ROUND(
            FL.FACTURALINIMP /
            (1 + TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) / 100),2)
            
        WHEN  TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) = 0
          THEN 0
        --WHEN CL.CONDICIONIVA <>'8' THEN 0 
        END
        AS IMP_NETO,

       CASE WHEN 
       TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0
       THEN '1' ELSE '3' END AS tipoOperacion,

         CASE 
            WHEN 
                TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0
                
         THEN       
         CASE 
            WHEN CL.CONDICIONIVA IN ('1','2','4','8') THEN '3'
            WHEN CL.CONDICIONIVA = '3' THEN '1'
            WHEN CL.CONDICIONIVA = '9' THEN '2'
          --  ELSE '3'
         END
         ELSE ' '
        END AS CondicionFiscal,
        CASE
        WHEN FL.FACTURAPRJIVA = '0' THEN ' '
        WHEN FL.FACTURAPRJIVA = '2,5' THEN '9'
         WHEN FL.FACTURAPRJIVA = '5' THEN '8'
         WHEN FL.FACTURAPRJIVA = '10,5' THEN '4' 
         WHEN FL.FACTURAPRJIVA = '21' THEN '5'
         WHEN FL.FACTURAPRJIVA = '27' THEN '6'
         END AS ALICUOTAIVA,
         --WHEN TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0 AND
         CASE WHEN TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0 
        THEN ROUND(
            FL.FACTURALINIMP -
            (FL.FACTURALINIMP /
             (1 + TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) / 100)),
        2)
        ELSE 0
        END AS DebitoFiscal,
        
        CASE 
            WHEN 
            TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) = 0 
            THEN FL.FACTURALINIMP
            ELSE 0
        END AS Exento

    FROM sigace.factura@SIGAPROD fa
    INNER JOIN sigace.facturalinea@SIGAPROD FL
      ON fa.empresaid=fl.empresaid
     AND fa.facturatpo=fl.facturatpo
     AND fa.facturanro=fl.facturanro
    INNER JOIN sigace.cliente@SIGAPROD cl
      ON cl.empresaid=fa.empresaid
     AND cl.clientenro=fa.clientenro
    LEFT JOIN sigace.CPTOFACTURAERP@SIGAPROD ct
      ON ct.empresaid=FL.empresaid
     AND ct.cptofacid=FL.cptofacid
    LEFT JOIN SIGACE.ERPFACTURAFAC@SIGAPROD f
      ON f.ERPFACTURAFACNRO=fa.FACTURANRO
     AND f.empresaid=fa.empresaid
     AND fa.facturatpo=f.ERPFACTURATPO
    LEFT JOIN SIGACE.ERPFACTURA@SIGAPROD EF
      ON EF.ERPFACTURAFCH = f.ERPFACTURAFCH
     AND EF.MONEDAID = f.MONEDAID
     AND EF.NEGOCIOSEGMENTO = f.NEGOCIOSEGMENTO
     AND EF.ERPFACTURACLIENTE = f.ERPFACTURACLIENTE
     AND EF.ERPFACTURATPO = f.ERPFACTURATPO
     AND EF.ERPFACTURAPTOVTA = f.ERPFACTURAPTOVTA
     AND EF.ERPFACTURACMPTETIPO = f.ERPFACTURACMPTETIPO
     AND EF.ERPFACTURALETRA = f.ERPFACTURALETRA
     AND EF.ERPFACTURACIUDADID = f.ERPFACTURACIUDADID
    LEFT JOIN SF1010 f1
     ON f1.d_e_l_e_t_=' '
    AND f1.f1_filial = LPAD(ef.EMPRESAID,2,'0')
    AND f1.f1_especie in ('NCC')
    AND f1.f1_doc = LPAD(EF.ERPFACTURAPTOVTA,4,'0')||LPAD(EF.ERPFACTURACMPTENRO,8,'0')
    LEFT JOIN SD1010 d
     ON d.d1_doc=f1.f1_doc
    AND d.d1_filial=f1.f1_filial
    AND d.d1_especie=f1.f1_especie
    AND d.d1_serie=f1.f1_serie
    AND d.d1_cod= TRIM(CT.CPTOFACTURAERPID)
    INNER JOIN SB1010 B
       ON  LPAD(fl.empresaid,2,'0') = B1_FILIAL
       AND B.D_E_L_E_T_=' '
       AND TRIM(B1_COD)=TRIM(CT.CPTOFACTURAERPID)
    LEFT JOIN SA1010 A1
     ON A1.a1_cod=f1.f1_fornece
    AND A1.a1_filial=f1.f1_filial
    WHERE fa.empresaid = :empresa
    AND fa.facturafch BETWEEN TO_DATE(:desde,'YYYYMMDD') AND TO_DATE(:hasta,'YYYYMMDD')
      AND fa.facturacatpo='E'
      AND fa.facturatpo IN ('N')
      AND ct.cptofacid not in (22023,22024)
) Q
GROUP BY
    CODIGOACT,
    tipoOperacion,
    CondicionFiscal,
    ALICUOTAIVA
    
    
`;

    const result = await connection.execute(
      query,
      { empresa, desde, hasta },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log("Filas Débito Fiscal:", result.rows.length);

    if (!result.rows || result.rows.length === 0) {
      console.log("No hay datos de debito fiscal.");
      return;
    }

    function formatoAFIP(valor) {
      if (valor === null || valor === undefined || valor === 0) return "";
      return valor.toString().replace(".", ",");
    }

    const nombreArchivo = `RESITUCION_DEBITO_FISCAL_${empresa}_${desde}_${hasta}.csv`;
    const rutaArchivo = path.join(carpetaDestino, nombreArchivo);
    const stream = fs.createWriteStream(rutaArchivo, { encoding: "utf8" });

    const csvStream = csv.format({
      headers: false,
      delimiter: ";"
    });

    csvStream.pipe(stream);

   csvStream.write({
  ACTIVIDAD: "ACTIVIDAD",
  TIPO_OPERACION: "TIPO DE OPERACION",
  TIPO_SUJETO: "TIPO DE SUJETO COMPRADOR",
  CODIGO_ALICUOTA: "CODIGO DE ALÍCUOTA",
  IMP_NETO: "MONTO NETO GRAVADO",
  DEBITO_FISCAL: "DEBITO FISCAL A RESTITUIR",
  EXENTO: "Monto Neto Exento o No Gravado"
    });

    //FILAS
   for (const fila of result.rows) {
  csvStream.write({
    ACTIVIDAD: fila.CODIGOACT,
    TIPO_OPERACION: fila.TIPOOPERACION,
    TIPO_SUJETO: fila.CONDICIONFISCAL,
    CODIGO_ALICUOTA: formatoAFIP(fila.ALICUOTAIVA),
    IMP_NETO: fila.IMPNETO === 0 ? "" : formatoAFIP(fila.IMPNETO),
    DEBITO_FISCAL: fila.DEBITOFISCAL === 0 ? "" : formatoAFIP(fila.DEBITOFISCAL),
    EXENTO: fila.EXENTO === 0 ? "" : formatoAFIP(fila.EXENTO)
  });
}

    csvStream.end();
    await new Promise(resolve => stream.on("finish", resolve));

    console.log("CSV generado correctamente:", nombreArchivo);

    console.log("CSV generado:", nombreArchivo);

  } catch (error) {
    console.error("Error generando Debito Fiscal:", error);
  } finally {
    if (connection) await connection.close();
  }
}

exportar_restitucion_debito_fiscal(3, "20251101", "20251130");