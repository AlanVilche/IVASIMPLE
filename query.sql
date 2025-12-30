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
            AND CL.CONDICIONIVA <>'8'
        THEN ROUND(
            FL.FACTURALINIMP /
            (1 + TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) / 100),2)
        ELSE 0 END
        AS IMP_NETO,

       CASE WHEN 
       TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0 and cl.CONDICIONIVA <> '8'
       THEN '1' ELSE '3' END AS tipoOperacion,

         CASE 
            WHEN 
                TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0
                
         THEN       
         CASE 
            WHEN CL.CONDICIONIVA IN ('1','2','4','8') THEN '3'
            WHEN CL.CONDICIONIVA = '3' THEN '1'
            WHEN CL.CONDICIONIVA = '9' THEN '2'
         END 
          ELSE '3'
        END AS CondicionFiscal,
        CASE
        WHEN FL.FACTURAPRJIVA = '0' OR CL.CONDICIONIVA='8' THEN '3'
        WHEN FL.FACTURAPRJIVA = '2,5' THEN '9'
         WHEN FL.FACTURAPRJIVA = '5' THEN '8'
         WHEN FL.FACTURAPRJIVA = '10,5' THEN '4' 
         WHEN FL.FACTURAPRJIVA = '21' THEN '5'
         WHEN FL.FACTURAPRJIVA = '27' THEN '6'
         END AS ALICUOTAIVA,
         --WHEN TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) > 0 AND
         CASE WHEN cl.CONDICIONIVA <> '8' 
        THEN ROUND(
            FL.FACTURALINIMP -
            (FL.FACTURALINIMP /
             (1 + TO_NUMBER(REPLACE(NVL(FL.FACTURAPRJIVA,'0'), ',', '.')) / 100)),
        2)
        ELSE 0
        END AS DebitoFiscal,
        
        CASE 
            WHEN 
            cl.CONDICIONIVA = '8' 
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
    LEFT JOIN SF2010 f2
     ON f2.d_e_l_e_t_=' '
    AND f2.f2_filial = LPAD(ef.EMPRESAID,2,'0')
    AND f2.f2_especie in ('NF')
    AND f2.f2_doc = LPAD(EF.ERPFACTURAPTOVTA,4,'0')||LPAD(EF.ERPFACTURACMPTENRO,8,'0')
    LEFT JOIN SD2010 d
     ON d.d2_doc=f2.f2_doc
    AND d.d2_filial=f2.f2_filial
    AND d.d2_especie=f2.f2_especie
    AND d.d2_serie=f2.f2_serie
    AND d.d2_cod= ct.CPTOFACTURAERPID
    INNER JOIN SB1010 B
       ON  LPAD(fl.empresaid,2,'0') = B1_FILIAL
       AND B.D_E_L_E_T_=' '
       AND TRIM(B1_COD)=TRIM(CT.CPTOFACTURAERPID)
    LEFT JOIN SA1010 A1
     ON A1.a1_cod=f2.f2_cliente
    AND A1.a1_filial=f2.f2_filial
    WHERE fa.empresaid = 1
      AND fa.facturafch BETWEEN TO_DATE('20251001','YYYYMMDD') AND TO_DATE('20251031','YYYYMMDD')
      AND fa.facturacatpo='E'
      AND fa.facturatpo IN ('F')
      AND fl.cptofacid not in ('22023,22024')
      AND B1_ACTDEC <>' '
) Q
GROUP BY
    CODIGOACT,
    tipoOperacion,
    CondicionFiscal,
    ALICUOTAIVA;
