-- PostgreSQL. Подготовленная витрина bookings, одна строка на первичную запись.
-- cohort уже включает только созревшие записи (окно наблюдения 14 дней).
SELECT
    cohort,
    channel,
    COUNT(*) AS total_bookings,
    COUNT(*) FILTER (WHERE outcome = 'visited') AS visits,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE outcome = 'visited')
        / NULLIF(COUNT(*), 0),
        1
    ) AS visit_rate_pct
FROM bookings
WHERE cohort IN ('before', 'after')
GROUP BY GROUPING SETS ((cohort, channel), (cohort))
ORDER BY cohort, channel NULLS FIRST;
