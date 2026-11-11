let
    Source = Csv.Document(File.Contents("C:\\Data\\peak-raw.csv"), [Delimiter=";", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, {
        {"id", type text}, {"scenario", type text}, {"zone", type text}, {"slot", type text},
        {"status", type text}, {"pick", Int64.Type}, {"wait", Int64.Type},
        {"ride", Int64.Type}, {"basket", Int64.Type}
    }),
    Indexed = Table.AddIndexColumn(Typed, "source_row", 1, 1, Int64.Type),
    Checks = Table.AddColumn(Indexed, "row_check", each
        if [wait] = null then "Пропуск ожидания"
        else if [ride] < 0 or [wait] < 0 or [pick] < 0 then "Отрицательное время"
        else if [basket] < 0 then "Отрицательный чек"
        else null, type nullable text),
    Candidates = Table.SelectRows(Checks, each [row_check] = null),
    FirstById = Table.Group(Candidates, {"id"}, {{"first_row", each List.Min([source_row]), Int64.Type}}),
    Joined = Table.NestedJoin(Checks, {"id"}, FirstById, {"id"}, "first", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "first", {"first_row"}, {"first_row"}),
    Flagged = Table.AddColumn(Expanded, "flag", each
        if [first_row] <> null and [source_row] > [first_row] then "Дубликат ID" else [row_check], type nullable text),
    Result = Table.RemoveColumns(Flagged, {"row_check", "first_row"}),
    Valid = Table.Sort(Table.SelectRows(Result, each [flag] = null), {{"source_row", Order.Ascending}}),
    Rejected = Table.Sort(Table.SelectRows(Result, each [flag] <> null), {{"source_row", Order.Ascending}})
in
    [Valid = Valid, Rejected = Rejected]
