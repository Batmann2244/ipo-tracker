/**
 * IPO Tracker - Real-time IPO monitoring and statistics
 */

import { Nse } from '../src/index.js';

const nse = new Nse();

async function showActiveIpos() {
    console.log('\n' + '='.repeat(100));
    console.log('📊 ACTIVE IPOs (Currently Open for Subscription)'.padStart(70));
    console.log('='.repeat(100));
    
    try {
        const currentIpos = await nse.getCurrentIpos();
        
        if (Array.isArray(currentIpos) && currentIpos.length > 0) {
            console.log(`\nFound ${currentIpos.length} active IPO(s)\n`);
            
            currentIpos.forEach((ipo, index) => {
                console.log(`${index + 1}. ${ipo.companyName || ipo.symbol || 'N/A'}`);
                console.log(`   Symbol: ${ipo.symbol || 'N/A'}`);
                console.log(`   Bidding Period: ${ipo.biddingStartDate || 'N/A'} to ${ipo.biddingEndDate || 'N/A'}`);
                console.log(`   Price Band: ₹${ipo.priceMin || 'N/A'} - ₹${ipo.priceMax || 'N/A'}`);
                
                if (ipo.subscribed) {
                    const subscriptionLevel = parseFloat(ipo.subscribed) || 0;
                    const color = subscriptionLevel > 100 ? '🔴' : subscriptionLevel > 50 ? '🟡' : '🟢';
                    console.log(`   Subscription Status: ${color} ${subscriptionLevel.toFixed(2)}x`);
                }
                
                if (ipo.shares) {
                    console.log(`   Shares on Offer: ${ipo.shares || 'N/A'}`);
                }
                
                console.log('');
            });
        } else {
            console.log('✅ No active IPOs currently open for subscription');
        }
    } catch (error) {
        console.log(`❌ Error fetching active IPOs: ${error.message}`);
    }
}

async function showUpcomingIpos() {
    console.log('\n' + '='.repeat(100));
    console.log('🔮 UPCOMING IPOs (Scheduled Launches)'.padStart(70));
    console.log('='.repeat(100));
    
    try {
        const upcomingIpos = await nse.getUpcomingIpos();
        
        if (Array.isArray(upcomingIpos) && upcomingIpos.length > 0) {
            console.log(`\nFound ${upcomingIpos.length} upcoming IPO(s)\n`);
            
            upcomingIpos.slice(0, 10).forEach((ipo, index) => {
                console.log(`${index + 1}. ${ipo.companyName || ipo.symbol || 'N/A'}`);
                
                if (ipo.openDate || ipo.biddingStartDate) {
                    console.log(`   Opening Date: ${ipo.openDate || ipo.biddingStartDate || 'TBD'}`);
                }
                
                if (ipo.sector) {
                    console.log(`   Sector: ${ipo.sector}`);
                }
                
                if (ipo.exchangeIssueType) {
                    console.log(`   Type: ${ipo.exchangeIssueType}`);
                }
                
                if (ipo.status) {
                    console.log(`   Status: ${ipo.status}`);
                }
                
                console.log('');
            });
        } else {
            console.log('✅ No upcoming IPOs scheduled');
        }
    } catch (error) {
        console.log(`⚠️  Upcoming IPOs data unavailable: ${error.message}`);
    }
}

async function showIpoStatistics() {
    console.log('\n' + '='.repeat(100));
    console.log('📈 IPO APPLICATION STATISTICS'.padStart(70));
    console.log('='.repeat(100));
    
    try {
        const stats = await nse.getIpoApplicationStatus();
        
        if (stats && typeof stats === 'object') {
            console.log('\nSubscription Summary:');
            
            if (Array.isArray(stats)) {
                let totalSubscribed = 0;
                let totalApplied = 0;
                
                stats.forEach(item => {
                    if (item.subscriptionStatus) {
                        console.log(`\n  ${item.symbol || 'Unknown Symbol'}:`);
                        console.log(`    Category: ${item.category || 'N/A'}`);
                        console.log(`    Subscription: ${item.subscriptionStatus}x`);
                        console.log(`    Shares Applied: ${item.sharesApplied || 'N/A'}`);
                        console.log(`    Amount Applied: ₹${item.amountApplied || 'N/A'}`);
                    }
                });
            } else {
                // Display raw stats if it's an object
                console.log(JSON.stringify(stats, null, 2).slice(0, 500) + '...');
            }
        }
    } catch (error) {
        console.log(`⚠️  IPO statistics unavailable: ${error.message}`);
    }
}

async function showAllIpos() {
    console.log('\n' + '='.repeat(100));
    console.log('📋 ALL IPOs'.padStart(70));
    console.log('='.repeat(100));
    
    try {
        const allIpos = await nse.getIpoList();
        
        if (allIpos && typeof allIpos === 'object') {
            if (Array.isArray(allIpos)) {
                console.log(`\nTotal IPOs in database: ${allIpos.length}\n`);
                
                // Group by status
                const byStatus = {};
                allIpos.forEach(ipo => {
                    const status = ipo.status || 'Unknown';
                    if (!byStatus[status]) byStatus[status] = [];
                    byStatus[status].push(ipo);
                });
                
                Object.entries(byStatus).forEach(([status, ipos]) => {
                    console.log(`${status}: ${ipos.length} IPO(s)`);
                });
                
                // Show sample IPOs
                console.log('\nRecent IPO Activities:');
                allIpos.slice(0, 5).forEach((ipo, i) => {
                    console.log(`  ${i + 1}. ${ipo.companyName || ipo.symbol} - ${ipo.status || 'N/A'}`);
                });
            } else {
                console.log('\nIPO List Summary:');
                console.log(JSON.stringify(allIpos, null, 2).slice(0, 500) + '...');
            }
        }
    } catch (error) {
        console.log(`⚠️  IPO list unavailable: ${error.message}`);
    }
}

async function runIpoTracker() {
    console.clear();
    console.log('\n🚀 NSE IPO TRACKER');
    console.log('Real-time IPO Monitoring'.padStart(50));
    console.log(`Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    try {
        // Run in parallel for speed
        await Promise.all([
            showActiveIpos(),
            showUpcomingIpos(),
            showAllIpos(),
            showIpoStatistics()
        ]);
        
        console.log('\n' + '='.repeat(100));
        console.log('✅ IPO Tracker Complete');
        console.log('='.repeat(100));
        
    } catch (error) {
        console.error(`\n❌ Error in IPO tracker: ${error.message}`);
    }
}

// Run the tracker
runIpoTracker();
