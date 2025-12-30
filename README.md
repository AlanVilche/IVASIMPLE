1- Cambiar la carpeta destino cuando arma el Path, en el const carpetaDestino por un directorio local.
2 - Escribir en el export de la funcion la fecha y filial para traer para ese periodo.
3 -Ejecutar comandos en la terminal:
VENTAS:
node exportar_afip.js //Para debito fiscal
node exportar_restitucion_debito_fiscal.js //para la devolucion o notas de credito
COMPRAS:
node exportar_credito_fiscal.js //Para credito o facturacion 
node exportar_restitucion_credito_fiscal.js //Para devolucion o notas de credito
