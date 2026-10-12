export const scrollDivision = [
'ASAHI',
'ASDP',
'ASL',
'CRUISE',
'EDN',
'ESM',
'HTC',
'ICM',
'LAND BASE',
'LISI',
'PCSI',
'RECRUITMENT',
'OTHER'
];

export const scrollPIC = [
    "HARNIFIRA",
    "DWI LAVENIA",
    "ALMUKAROM",
    "DWI DAVID",
    "ENDAH NUR WIDHIANINGSIH",
    "CHINDY"
];

export function getPICByDivision(division: string): string[] {
    if (division === "ASAHI" || division === "PCSI" ) {
        return ["HARNIFIRA"];
    }
    else if (division === "ASDP" || division === "ASL" || division === "HTC" || division === "LISI") {
        return ["DWI LAVENIA"];
    }
    else if ( division === "EDN" || division === "ESM") {
    return ["DWI DAVID"];
    }
    else if (division === "CRUISE" || division === "LAND BASE" || division === "ICM") {
        return ["ALMUKAROM", "ENDAH NUR WIDHIANINGSIH"];
    }
    else if (division === "RECRUITMENT") {
        return ["CHINDY"];
    }
    else {
        return [];
    }
}