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
'CREWING',
'MCSI'
];

export const scrollRank = [
    'MASTER',
    'CHIEF OFFICER',
    '1ST OFFICER',
    '2ND OFFICER',
    '3RD OFFICER',
    '4TH OFFICER',
    '5TH OFFICER',
    'CHIEF ENGINEER',
    '1ST ENGINEER',
    '2ND ENGINEER',
    '3RD ENGINEER',
    '4TH ENGINEER',
    '5TH ENGINEER',
    'BOASTWAIN',
    'ABLE SEAMAN',
    'ORDINARY SEAMAN',
    'NO. 1 OILER',
    'FITTER',
    'OILER',
    'WIPER',
    'CHIEF COOK',
    'COOK',
    'MESSMAN',
    'OTHERS',
]

export const scrollPIC = [
    "HARNIFIRA",
    "DWI LAVENIA",
    "ALMUKAROM",
    "DWI DAVID",
    "ENDAH NUR WIDHIANINGSIH",
    "CHINDY",
    "ARI WIBOWO"
];

export function getPICByDivision(division: string): string[] {
    if (division === "MCSI") {
        return scrollPIC;
    }
    else if (division === "ASAHI" || division === "PCSI" ) {
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
    else if (division === "CREWING") {
        return ["CHINDY"];
    }
    else {
        return [];
    }
}