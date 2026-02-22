
const matchedUrls = [
    'https://example.com/api/GetPipoData',
    'https://example.com/IPOIssues',
    'https://example.com/PublicIssueData',
    'https://example.com/api/GetData',
    'https://example.com/other'
];

async function checkLogic(url: string, contentType: string) {
    console.log(`Testing ${url} with ${contentType}`);

    // Outer filter simulation
    if (
        url.includes('GetPipoData') ||
        url.includes('IPOIssues') ||
        url.includes('PublicIssueData') ||
        url.includes('/api/') ||
        url.includes('GetData')
    ) {
        // Original logic
        let isJson = contentType.includes('application/json');
        if (!isJson && (url.includes('GetPipoData') || url.includes('/api/') || url.includes('GetData'))) {
            isJson = true;
        }

        if (isJson || true) {
            console.log('  -> Attempting JSON parse (MATCHED)');
        } else {
            console.log('  -> SKIPPING JSON parse');
        }
    } else {
        console.log('  -> URL ignored by outer filter');
    }
}

// Run checks
checkLogic('https://example.com/api/GetPipoData', 'application/json');
checkLogic('https://example.com/IPOIssues', 'text/html');
checkLogic('https://example.com/PublicIssueData', 'text/html');
checkLogic('https://example.com/other', 'text/html');
