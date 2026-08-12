# Análisis del Excel — Fase 1

Fuente: `Resumen_de_gastos_Puerto_Chancay.xlsx` (18 hojas).

## Hojas y su rol

| Hoja | Rol |
|---|---|
| `tarifas` | Tarifas maestras de flete por planta (S/TN) |
| `BD` | Bitácora ticket a ticket de un buque (detalle operativo crudo) |
| `Gastos de Transporte` / `Gastos transporte BI` | Costeo de transporte: planta × transportista |
| `Gastos de Descarga` / `Gastos de descarga BI` | Costeo de descarga: Chancay vs Callao, 4 componentes |
| `Gastos Totales` | Consolidado por buque: descarga + transporte + almacenamiento + demurrage |
| `Resumen Puertos` | Tabla plana 1 fila = buque×puerto, con todos los costos y unitarios |
| `Comparativo` | Gasto real vs presupuestado (benchmark fijo TN×18.5×3.5) |
| `Gastos totales BI` | Resumen igual a Resumen Puertos, enlazado a Gastos Totales |
| `Gestión CA` | Ahorro logístico por nave (fletes + demurrage) |
| `Gastos APM` | Igual patrón que Gastos Totales, mensual, compara operador APM vs COSCO |
| `Laytime2024` / `Laytime2025` | Demurrage/despatch por buque, con pivote por mes |
| `grafico`, `grafico 2026`, `Grafico Laytime` | Visualizaciones existentes |

## Reglas de cálculo

- **Descarga** = CU_descarga (S/TN, suma de 4 componentes con su propia moneda) × toneladas, convertido a USD con TC.
- **Transporte** = Σ por planta (tarifa planta+transportista en S/TN × toneladas a esa planta).
- **Almacenamiento** = inconsistente entre bloques (ver ambigüedad #1).
- **Demurrage/Despatch** = monto fijo por operación, viene de Laytime; demurrage suma, despatch resta.
- **Costo total** = descarga + transporte + almacenamiento + demurrage ± cambio de muelle.
- **Costo por TN** = costo total / toneladas.

## Entidades principales

Puerto, Planta/destino, Transportista, Producto, Buque, tarifa de transporte
(planta+transportista), tarifa de descarga (puerto, 4 componentes).

## Ambigüedades pendientes de confirmar con el usuario

1. Regla de cálculo de almacenamiento — dos métodos distintos en el Excel sin criterio documentado.
2. Celda `tarifas!L2` guardada como fecha en vez de número (probable error de captura).
3. Tipo de cambio inconsistente entre bloques, sin regla de cuál usar.
4. Signo de demurrage/despatch inconsistente en el Excel (se resolvió en el modelo con columna `type`, pero falta validar montos migrados).
5. "Ransa"/"Warehouse" en algunos bloques: ¿cuarta planta o concepto distinto?
6. `BD` solo cubre 1 buque — no se sabe si es el único detalle disponible.
7. Origen del "gasto presupuestado" (`TN×18.5×3.5`) en `Comparativo` no está documentado.
8. Fórmulas de `Gastos Totales`/`Gestión CA` referencian celdas por coordenada fija, sin ID de buque reutilizable.

Estas ambigüedades no bloquean el diseño de la base de datos (que se hizo
flexible en los puntos afectados), pero **sí deben resolverse antes de
confiar en los cálculos del motor de simulación en producción**.
