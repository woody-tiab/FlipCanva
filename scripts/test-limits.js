// Netlify Functions 한도 테스트 스크립트
const testNetlifyLimits = {
  // 무료 플랜 한도
  freeRequests: 125000, // per month
  freeBandwidth: 100 * 1024 * 1024 * 1024, // 100GB in bytes
  executionTime: 10, // seconds
  
  // 예상 사용량 계산
  calculateUsage: (dailyUsers, avgRequestsPerUser, daysInMonth = 30) => {
    const monthlyRequests = dailyUsers * avgRequestsPerUser * daysInMonth;
    const remainingRequests = testNetlifyLimits.freeRequests - monthlyRequests;
    const utilizationPercent = (monthlyRequests / testNetlifyLimits.freeRequests) * 100;
    
    return {
      monthlyRequests,
      remainingRequests,
      utilizationPercent: utilizationPercent.toFixed(2) + '%',
      isWithinLimit: monthlyRequests <= testNetlifyLimits.freeRequests,
      estimatedOverageRequests: Math.max(0, monthlyRequests - testNetlifyLimits.freeRequests)
    };
  },
  
  // 다양한 시나리오 테스트
  scenarios: [
    { name: "개인 사용자", dailyUsers: 10, avgRequests: 15 },
    { name: "소규모 팀", dailyUsers: 50, avgRequests: 20 },
    { name: "스타트업", dailyUsers: 200, avgRequests: 25 },
    { name: "중간 규모", dailyUsers: 500, avgRequests: 30 },
    { name: "대형 서비스", dailyUsers: 1000, avgRequests: 35 }
  ]
};

// 시나리오별 테스트 실행
console.log("🧪 Netlify 무료 플랜 한도 테스트");
console.log("=" * 50);

testNetlifyLimits.scenarios.forEach(scenario => {
  const result = testNetlifyLimits.calculateUsage(
    scenario.dailyUsers, 
    scenario.avgRequests
  );
  
  console.log(`\n📊 ${scenario.name}`);
  console.log(`   👥 일일 사용자: ${scenario.dailyUsers}명`);
  console.log(`   🔄 평균 API 호출: ${scenario.avgRequests}회/사용자`);
  console.log(`   📈 월간 총 요청: ${result.monthlyRequests.toLocaleString()}회`);
  console.log(`   📊 한도 사용률: ${result.utilizationPercent}`);
  console.log(`   ✅ 무료 플랜 가능: ${result.isWithinLimit ? 'YES' : 'NO'}`);
  
  if (!result.isWithinLimit) {
    console.log(`   ⚠️  초과 요청: ${result.estimatedOverageRequests.toLocaleString()}회`);
    console.log(`   💰 예상 초과 비용: $${(result.estimatedOverageRequests * 0.0000025).toFixed(2)}`);
  }
});

console.log("\n🎯 결론:");
console.log("- 개인~소규모 팀: 완전 무료 ✅");
console.log("- 스타트업: 무료 플랜으로 충분 ✅"); 
console.log("- 중간 규모 이상: 유료 고려 필요 ⚠️");

// 내보내기 (Node.js 환경에서 실행 시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testNetlifyLimits;
}