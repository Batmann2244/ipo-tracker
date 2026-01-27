/**
 * Simple IPO Test - Check if IPO methods work
 */

import { Nse } from '../src/index.js';

const nse = new Nse();

console.log('🚀 Testing IPO Data Retrieval\n');

async function testIpos() {
    try {
        console.log('1️⃣ Testing getIpoList()...');
        const ipoList = await nse.getIpoList();
        console.log(`   ✅ Retrieved IPO list: ${Array.isArray(ipoList) ? ipoList.length + ' items' : 'object with data'}`);
        if (Array.isArray(ipoList) && ipoList.length > 0) {
            console.log(`   Sample: ${ipoList[0].symbol || ipoList[0].companyName || 'N/A'}`);
        }
    } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
    }
    
    try {
        console.log('\n2️⃣ Testing getIpoApplicationStatus()...');
        const status = await nse.getIpoApplicationStatus();
        console.log(`   ✅ Retrieved IPO status data`);
        if (Array.isArray(status)) {
            console.log(`   Found ${status.length} items`);
        }
    } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
    }
    
    try {
        console.log('\n3️⃣ Testing getUpcomingIpos()...');
        const upcoming = await nse.getUpcomingIpos();
        console.log(`   ✅ Retrieved upcoming IPOs`);
        if (Array.isArray(upcoming)) {
            console.log(`   Found ${upcoming.length} upcoming IPOs`);
        }
    } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
    }
    
    try {
        console.log('\n4️⃣ Testing getCurrentIpos()...');
        const current = await nse.getCurrentIpos();
        console.log(`   ✅ Retrieved current IPOs`);
        if (Array.isArray(current)) {
            console.log(`   Found ${current.length} active IPOs`);
            if (current.length > 0) {
                console.log(`   First: ${current[0].companyName || current[0].symbol || 'N/A'}`);
            }
        }
    } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
    }
    
    console.log('\n✅ IPO data retrieval tests complete!');
}

testIpos().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
