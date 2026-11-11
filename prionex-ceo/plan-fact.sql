-- SQLite. Run the full script in a new database.
-- Amounts are whole EUR. Payments are settled net of reversals.
CREATE TABLE portfolio_input (
 row_id INTEGER PRIMARY KEY, portfolio TEXT NOT NULL, monthly_target_eur INTEGER NOT NULL,
 planned_balance_eur INTEGER NOT NULL, planned_rate REAL NOT NULL,
 assigned_balance_eur INTEGER, settled_payments_eur INTEGER
);
INSERT INTO portfolio_input VALUES
 (1,'NORTH',180000,600000,0.18,500000,75000),
 (2,'EAST',150000,500000,0.18,500000,97000),
 (3,'WEST',120000,400000,0.18,400000,68000),
 (4,'NORTH',180000,600000,0.18,500000,75000),
 (5,'SOUTH',50000,166000,0.18,NULL,NULL),
 (6,'WEST',120000,400000,0.18,400000,410000);

-- Choose the earliest valid row for each portfolio. Show exceptions separately.
CREATE TEMP VIEW checked AS
WITH ranked AS (
 SELECT row_id, ROW_NUMBER() OVER(PARTITION BY portfolio ORDER BY row_id) AS ordinal
 FROM portfolio_input
 WHERE assigned_balance_eur > 0 AND settled_payments_eur BETWEEN 0 AND assigned_balance_eur
)
SELECT i.*, CASE
 WHEN assigned_balance_eur IS NULL OR settled_payments_eur IS NULL THEN 'missing'
 WHEN ordinal IS NULL THEN 'invalid'
 WHEN ordinal > 1 THEN 'duplicate'
 ELSE 'included'
 END AS status
FROM portfolio_input AS i LEFT JOIN ranked USING(row_id);

SELECT row_id, portfolio, status FROM checked WHERE status <> 'included' ORDER BY row_id;

-- Change pace_factor to 0.85 or 1.20 for the other scenarios.
WITH settings(elapsed, period_days, pace_factor) AS (VALUES (12,20,1.0)),
drivers AS (
 SELECT portfolio, monthly_target_eur, assigned_balance_eur, settled_payments_eur,
        planned_balance_eur * planned_rate AS cutoff_target_eur,
        (assigned_balance_eur-planned_balance_eur)*planned_rate AS balance_effect_eur,
        settled_payments_eur-assigned_balance_eur*planned_rate AS rate_effect_eur
 FROM checked WHERE status='included'
), rollup AS (
 SELECT * FROM drivers
 UNION ALL
 SELECT 'REPORTING_TOTAL', SUM(monthly_target_eur), SUM(assigned_balance_eur),
        SUM(settled_payments_eur), SUM(cutoff_target_eur), SUM(balance_effect_eur), SUM(rate_effect_eur)
 FROM drivers
)
SELECT portfolio, monthly_target_eur, settled_payments_eur, cutoff_target_eur,
       settled_payments_eur-cutoff_target_eur AS variance_eur,
       ROUND(1.0*settled_payments_eur/assigned_balance_eur,4) AS recovery_rate,
       balance_effect_eur, rate_effect_eur,
       CAST(ROUND(settled_payments_eur + 1.0*settled_payments_eur/elapsed
                  *(period_days-elapsed)*pace_factor) AS INTEGER) AS forecast_eur
FROM rollup CROSS JOIN settings;

-- Synthetic SMS delivery evidence. Confirm causality with comparable cohorts.
WITH sms(cut, delivered, attempted) AS (
 VALUES ('current',360,500),
        ('previous',470,500)
)
SELECT cut, delivered, attempted, 1.0*delivered/attempted AS delivered_rate FROM sms;
