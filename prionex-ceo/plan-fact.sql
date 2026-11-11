-- SQLite: execute the whole file in a new database.
CREATE TABLE input (
 row_id INTEGER PRIMARY KEY, project TEXT, month_plan INTEGER, cutoff_leads INTEGER,
 cutoff_rate REAL, leads INTEGER, activations INTEGER, received INTEGER
);
INSERT INTO input VALUES
 (1,'CRM',1000,1200,.50,1000,450,1),
 (2,'FLOW',800,1200,.40,1210,502,1),
 (3,'DATA',600,800,.45,780,320,1),
 (4,'CRM',1000,1200,.50,1000,450,1),
 (5,'LEGACY',250,300,.50,NULL,NULL,0);

WITH valid AS (
 SELECT *, ROW_NUMBER() OVER(PARTITION BY project ORDER BY row_id) AS rn
 FROM input
 WHERE received = 1 AND leads >= 0 AND activations BETWEEN 0 AND leads
), drivers AS (
 SELECT project, month_plan, activations,
        cutoff_leads * cutoff_rate AS cutoff_plan,
        (leads - cutoff_leads) * cutoff_rate AS volume_effect,
        activations - leads * cutoff_rate AS conversion_effect
 FROM valid WHERE rn = 1
), rollup AS (
 SELECT * FROM drivers
 UNION ALL
 SELECT 'TOTAL', SUM(month_plan), SUM(activations), SUM(cutoff_plan),
        SUM(volume_effect), SUM(conversion_effect)
 FROM drivers
)
SELECT project, month_plan, activations, ROUND(cutoff_plan,2) AS cutoff_plan,
       ROUND(activations-cutoff_plan,2) AS gap,
       ROUND(volume_effect,2) AS volume_effect,
       ROUND(conversion_effect,2) AS conversion_effect,
       CAST(ROUND(activations + activations * 8.0 / 12) AS INTEGER) AS base_forecast
FROM rollup;
