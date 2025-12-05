/**
 * TOON (Token-Oriented Object Notation) Experiment
 *
 * This is a standalone test to explore TOON format for potential use in the task scheduler.
 * TOON is claimed to reduce tokens by ~40% vs JSON while improving accuracy.
 *
 * Based on: https://github.com/toon-format/toon
 *
 * SAFE TO DELETE - This file doesn't affect production code.
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { encode, decode } from '@toon-format/toon';
import dotenv from 'dotenv';

dotenv.config();

// ==============================================================================
// TOKEN COUNTING
// ==============================================================================

/**
 * Rough token estimation (1 token ≈ 4 characters for English text)
 * This is a simplified approximation. Real tokenization is more complex.
 */
function estimateTokens(text: string): number {
  // Simple approximation: 1 token per 4 characters
  return Math.ceil(text.length / 4);
}

// ==============================================================================
// COMPARISON TEST
// ==============================================================================

async function runComparisonTest() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  TOON vs JSON Format Comparison for Task Scheduling             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Sample task data (based on real user request)
  const sampleTask = {
    title: 'Test Number One',
    description: `Thing number one, which is a test
Thing number two, which is another test
Thing number three, more tests
Thing number four, which is more tests of tests
Thing number five, which is the last test that we will do`,
    priority: 'medium',
    estimatedDuration: 60,
    preferredStartDate: '2025-12-05T17:00:00Z'
  };

  // JSON format
  const jsonFormat = `SCHEDULE_TASK:${JSON.stringify(sampleTask)}`;

  // TOON format
  const toonFormatted = encode(sampleTask);
  const toonFormat = `SCHEDULE_TASK:\n${toonFormatted}`;

  console.log('📋 Sample Task Data:\n');
  console.log('─────────────────────────────────────────────────────────────────\n');

  console.log('JSON Format:');
  console.log(jsonFormat);
  console.log(`\nToken estimate: ${estimateTokens(jsonFormat)} tokens`);
  console.log(`Character count: ${jsonFormat.length} chars\n`);

  console.log('─────────────────────────────────────────────────────────────────\n');

  console.log('TOON Format:');
  console.log(toonFormat);
  console.log(`\nToken estimate: ${estimateTokens(toonFormat)} tokens`);
  console.log(`Character count: ${toonFormat.length} chars\n`);

  console.log('─────────────────────────────────────────────────────────────────\n');

  const tokenSavings = estimateTokens(jsonFormat) - estimateTokens(toonFormat);
  const savingsPercent = ((tokenSavings / estimateTokens(jsonFormat)) * 100).toFixed(1);

  console.log(`💡 Token Savings: ${tokenSavings} tokens (${savingsPercent}%)\n`);

  // Test round-trip conversion
  console.log('🔄 Testing round-trip conversion (TOON → Object → TOON):\n');
  const decoded = decode(toonFormatted);
  const reencoded = encode(decoded);
  console.log('Original matches re-encoded:', toonFormatted === reencoded);
  console.log('Decoded object:', JSON.stringify(decoded, null, 2));

  console.log('\n─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// LLM COMPREHENSION TEST
// ==============================================================================

async function runLLMTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing LLM Comprehension: JSON vs TOON                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.7
  });

  const testRequest = 'Schedule a meeting with my boss tomorrow afternoon';

  // Test with JSON format
  console.log('🧪 Test 1: JSON Format Response\n');
  console.log('User request:', testRequest);
  console.log('\nAsking LLM to respond in JSON format...\n');

  const jsonSystemPrompt = new SystemMessage(`You are a task scheduling assistant. When a user requests a task, respond ONLY with:
SCHEDULE_TASK:{"title":"task name","description":"task details","priority":"low|medium|high","estimatedDuration":60,"preferredStartDate":"2025-12-06T22:00:00Z"}

Current date: 2025-12-05T06:00:00Z`);

  const jsonResponse = await llm.invoke([
    jsonSystemPrompt,
    new HumanMessage(testRequest)
  ]);

  console.log('Response:');
  console.log(jsonResponse.content);

  const jsonPromptTokens = jsonResponse.response_metadata?.tokenUsage?.promptTokens || 0;
  const jsonCompletionTokens = jsonResponse.response_metadata?.tokenUsage?.completionTokens || 0;
  const jsonTotalTokens = jsonResponse.response_metadata?.tokenUsage?.totalTokens || 0;
  const jsonInputCost = (jsonPromptTokens * 0.150) / 1_000_000;
  const jsonOutputCost = (jsonCompletionTokens * 0.600) / 1_000_000;
  const jsonCost = jsonInputCost + jsonOutputCost;

  console.log('\n💰 Token Usage (JSON):');
  console.log(`   Prompt tokens: ${jsonPromptTokens}`);
  console.log(`   Completion tokens: ${jsonCompletionTokens}`);
  console.log(`   Total tokens: ${jsonTotalTokens}`);
  console.log(`   Cost: $${jsonCost.toFixed(6)}`);

  // Test with TOON format
  console.log('\n─────────────────────────────────────────────────────────────────\n');
  console.log('🧪 Test 2: TOON Format Response\n');
  console.log('User request:', testRequest);
  console.log('\nAsking LLM to respond in TOON format...\n');

  const exampleToon = encode({
    title: 'task name',
    description: 'task details',
    priority: 'medium',
    estimatedDuration: 60,
    preferredStartDate: '2025-12-06T22:00:00Z'
  });

  const toonSystemPrompt = new SystemMessage(`You are a task scheduling assistant. When a user requests a task, respond ONLY in TOON format like this example:
SCHEDULE_TASK:
${exampleToon}

Current date: 2025-12-05T06:00:00Z`);

  const toonResponse = await llm.invoke([
    toonSystemPrompt,
    new HumanMessage(testRequest)
  ]);

  console.log('Response:');
  console.log(toonResponse.content);

  const toonPromptTokens = toonResponse.response_metadata?.tokenUsage?.promptTokens || 0;
  const toonCompletionTokens = toonResponse.response_metadata?.tokenUsage?.completionTokens || 0;
  const toonTotalTokens = toonResponse.response_metadata?.tokenUsage?.totalTokens || 0;
  const toonInputCost = (toonPromptTokens * 0.150) / 1_000_000;
  const toonOutputCost = (toonCompletionTokens * 0.600) / 1_000_000;
  const toonCost = toonInputCost + toonOutputCost;

  console.log('\n💰 Token Usage (TOON):');
  console.log(`   Prompt tokens: ${toonPromptTokens}`);
  console.log(`   Completion tokens: ${toonCompletionTokens}`);
  console.log(`   Total tokens: ${toonTotalTokens}`);
  console.log(`   Cost: $${toonCost.toFixed(6)}`);

  // Calculate savings
  const jsonTokens = jsonResponse.response_metadata?.tokenUsage?.totalTokens || 0;
  const toonTokens = toonResponse.response_metadata?.tokenUsage?.totalTokens || 0;
  const savings = jsonTokens - toonTokens;
  const savingsPercent = jsonTokens > 0 ? ((savings / jsonTokens) * 100).toFixed(1) : '0';

  console.log('\n─────────────────────────────────────────────────────────────────\n');
  console.log('💰 Results Summary:\n');
  console.log(`   JSON total tokens: ${jsonTokens}`);
  console.log(`   TOON total tokens: ${toonTokens}`);
  console.log(`   Savings: ${savings} tokens (${savingsPercent}%)`);

  // Calculate cost difference (gpt-4o-mini pricing)
  const jsonTotalInputCost = ((jsonResponse.response_metadata?.tokenUsage?.promptTokens || 0) * 0.150) / 1_000_000;
  const jsonTotalOutputCost = ((jsonResponse.response_metadata?.tokenUsage?.completionTokens || 0) * 0.600) / 1_000_000;
  const jsonTotalCost = jsonTotalInputCost + jsonTotalOutputCost;

  const toonTotalInputCost = ((toonResponse.response_metadata?.tokenUsage?.promptTokens || 0) * 0.150) / 1_000_000;
  const toonTotalOutputCost = ((toonResponse.response_metadata?.tokenUsage?.completionTokens || 0) * 0.600) / 1_000_000;
  const toonTotalCost = toonTotalInputCost + toonTotalOutputCost;

  const costSavings = jsonTotalCost - toonTotalCost;

  console.log(`\n   JSON cost: $${jsonTotalCost.toFixed(8)}`);
  console.log(`   TOON cost: $${toonTotalCost.toFixed(8)}`);
  console.log(`   Cost savings per request: $${costSavings.toFixed(8)}`);

  // Extrapolate to 1000 requests
  console.log(`\n   Projected savings over 1,000 requests: $${(costSavings * 1000).toFixed(6)}`);
  console.log(`   Projected savings over 10,000 requests: $${(costSavings * 10000).toFixed(4)}`);
  console.log('\n─────────────────────────────────────────────────────────────────\n');

  // Try parsing the TOON response
  console.log('\n🔍 Parsing TOON response:\n');
  try {
    const responseText = toonResponse.content as string;
    const toonPart = responseText.split('SCHEDULE_TASK:')[1]?.trim();
    if (toonPart) {
      const parsed = decode(toonPart);
      console.log('✅ Successfully parsed TOON response:');
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      console.log('⚠️  Could not extract TOON data from response');
    }
  } catch (error) {
    console.log('❌ Error parsing TOON:', error);
  }
  console.log('\n─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// MULTIPLE TASK TEST
// ==============================================================================

async function runMultipleTaskTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing Multiple Tasks: JSON vs TOON                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const tasks = [
    {
      title: 'Team Standup',
      description: 'Daily team sync',
      priority: 'medium',
      estimatedDuration: 30,
      preferredStartDate: '2025-12-05T17:00:00Z'
    },
    {
      title: 'Code Review',
      description: 'Review PRs for authentication feature',
      priority: 'high',
      estimatedDuration: 60,
      preferredStartDate: '2025-12-05T18:00:00Z'
    },
    {
      title: 'Documentation',
      description: 'Update API documentation',
      priority: 'low',
      estimatedDuration: 90,
      preferredStartDate: '2025-12-05T20:00:00Z'
    }
  ];

  console.log('📋 Testing with 3 tasks:\n');

  // JSON array
  const jsonArray = JSON.stringify(tasks);
  console.log('JSON Array:');
  console.log(jsonArray);
  console.log(`\nToken estimate: ${estimateTokens(jsonArray)} tokens`);
  console.log(`Character count: ${jsonArray.length} chars\n`);

  console.log('─────────────────────────────────────────────────────────────────\n');

  // TOON array
  const toonArray = encode(tasks);
  console.log('TOON Array:');
  console.log(toonArray);
  console.log(`\nToken estimate: ${estimateTokens(toonArray)} tokens`);
  console.log(`Character count: ${toonArray.length} chars\n`);

  const tokenSavings = estimateTokens(jsonArray) - estimateTokens(toonArray);
  const savingsPercent = ((tokenSavings / estimateTokens(jsonArray)) * 100).toFixed(1);

  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log(`💡 Token Savings (3 tasks): ${tokenSavings} tokens (${savingsPercent}%)\n`);
  console.log('Note: Savings typically increase with more data/tasks!\n');
  console.log('─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// LARGE DATASET TEST
// ==============================================================================

async function runLargeDatasetTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing Large Datasets: JSON vs TOON                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Create 20 tasks with varying complexity
  const largeTasks = Array.from({ length: 20 }, (_, i) => ({
    title: `Task ${i + 1}: ${['Planning', 'Development', 'Review', 'Testing', 'Deployment'][i % 5]}`,
    description: `Detailed description for task ${i + 1}. This includes multiple requirements:\n- Requirement A: Complete initial setup\n- Requirement B: Review documentation\n- Requirement C: Test implementation\n- Requirement D: Deploy to staging\n- Requirement E: Perform final validation`,
    priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
    estimatedDuration: 30 + (i * 10),
    preferredStartDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['backend', 'frontend', 'database', 'api'].slice(0, (i % 4) + 1),
    assignee: `user${(i % 5) + 1}@example.com`,
    status: ['pending', 'in_progress', 'completed'][i % 3]
  }));

  console.log(`📋 Testing with ${largeTasks.length} complex tasks:\n`);

  // JSON format
  const jsonLarge = JSON.stringify(largeTasks);
  console.log('JSON Format:');
  console.log(`   Token estimate: ${estimateTokens(jsonLarge)} tokens`);
  console.log(`   Character count: ${jsonLarge.length} chars`);
  console.log(`   Size: ${(jsonLarge.length / 1024).toFixed(2)} KB\n`);

  // TOON format
  const toonLarge = encode(largeTasks);
  console.log('TOON Format:');
  console.log(`   Token estimate: ${estimateTokens(toonLarge)} tokens`);
  console.log(`   Character count: ${toonLarge.length} chars`);
  console.log(`   Size: ${(toonLarge.length / 1024).toFixed(2)} KB\n`);

  const tokenSavings = estimateTokens(jsonLarge) - estimateTokens(toonLarge);
  const savingsPercent = ((tokenSavings / estimateTokens(jsonLarge)) * 100).toFixed(1);
  const byteSavings = jsonLarge.length - toonLarge.length;
  const byteSavingsPercent = ((byteSavings / jsonLarge.length) * 100).toFixed(1);

  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log('💡 Savings Summary:\n');
  console.log(`   Token savings: ${tokenSavings} tokens (${savingsPercent}%)`);
  console.log(`   Byte savings: ${byteSavings} bytes (${byteSavingsPercent}%)`);
  console.log(`   ${toonLarge.length < jsonLarge.length ? '✅ TOON is more efficient' : '❌ JSON is more efficient'}\n`);
  console.log('─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// NESTED OBJECT TEST
// ==============================================================================

async function runNestedObjectTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing Nested Objects: JSON vs TOON                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Complex nested structure
  const nestedData = {
    project: {
      id: 'proj-12345',
      name: 'AI Task Scheduler',
      metadata: {
        created: '2025-12-01T00:00:00Z',
        updated: '2025-12-05T00:00:00Z',
        version: '1.0.0'
      },
      team: {
        lead: { name: 'Alice', email: 'alice@example.com', role: 'Tech Lead' },
        members: [
          { name: 'Bob', email: 'bob@example.com', role: 'Developer', skills: ['TypeScript', 'React', 'Node.js'] },
          { name: 'Carol', email: 'carol@example.com', role: 'Designer', skills: ['UI/UX', 'Figma'] },
          { name: 'Dave', email: 'dave@example.com', role: 'QA', skills: ['Testing', 'Automation'] }
        ]
      },
      tasks: [
        {
          id: 1,
          title: 'Setup Infrastructure',
          subtasks: [
            { id: 101, title: 'Configure AWS', status: 'completed', assignee: 'Bob' },
            { id: 102, title: 'Setup CI/CD', status: 'in_progress', assignee: 'Bob' },
            { id: 103, title: 'Database Migration', status: 'pending', assignee: 'Alice' }
          ]
        },
        {
          id: 2,
          title: 'UI Development',
          subtasks: [
            { id: 201, title: 'Design System', status: 'completed', assignee: 'Carol' },
            { id: 202, title: 'Component Library', status: 'in_progress', assignee: 'Bob' },
            { id: 203, title: 'Responsive Layout', status: 'pending', assignee: 'Carol' }
          ]
        }
      ],
      config: {
        api: { baseUrl: 'https://api.example.com', timeout: 5000, retries: 3 },
        database: { host: 'localhost', port: 5432, name: 'scheduler_db' },
        features: { darkMode: true, analytics: true, notifications: false }
      }
    }
  };

  console.log('📋 Testing deeply nested project structure:\n');

  // JSON format
  const jsonNested = JSON.stringify(nestedData);
  console.log('JSON Format:');
  console.log(`   Token estimate: ${estimateTokens(jsonNested)} tokens`);
  console.log(`   Character count: ${jsonNested.length} chars\n`);

  // TOON format
  const toonNested = encode(nestedData);
  console.log('TOON Format:');
  console.log(`   Token estimate: ${estimateTokens(toonNested)} tokens`);
  console.log(`   Character count: ${toonNested.length} chars\n`);

  const tokenSavings = estimateTokens(jsonNested) - estimateTokens(toonNested);
  const savingsPercent = ((tokenSavings / estimateTokens(jsonNested)) * 100).toFixed(1);

  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log(`💡 Token Savings (nested): ${tokenSavings} tokens (${savingsPercent}%)\n`);
  console.log('─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// REPEATED STRUCTURE TEST
// ==============================================================================

async function runRepeatedStructureTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing Repeated Structures: JSON vs TOON                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 50 identical structure with different values
  const repeatedStructures = Array.from({ length: 50 }, (_, i) => ({
    userId: `user-${1000 + i}`,
    username: `user${i}`,
    email: `user${i}@example.com`,
    profile: {
      firstName: `First${i}`,
      lastName: `Last${i}`,
      age: 20 + (i % 50),
      location: {
        city: ['NYC', 'SF', 'LA', 'Chicago', 'Boston'][i % 5],
        state: ['NY', 'CA', 'CA', 'IL', 'MA'][i % 5],
        zip: `${10000 + i}`
      }
    },
    preferences: {
      notifications: i % 2 === 0,
      darkMode: i % 3 === 0,
      language: ['en', 'es', 'fr'][i % 3]
    },
    stats: {
      tasksCompleted: i * 10,
      tasksInProgress: i % 5,
      totalPoints: i * 100
    }
  }));

  console.log(`📋 Testing ${repeatedStructures.length} records with identical structure:\n`);

  // JSON format
  const jsonRepeated = JSON.stringify(repeatedStructures);
  console.log('JSON Format:');
  console.log(`   Token estimate: ${estimateTokens(jsonRepeated)} tokens`);
  console.log(`   Character count: ${jsonRepeated.length} chars`);
  console.log(`   Size: ${(jsonRepeated.length / 1024).toFixed(2)} KB\n`);

  // TOON format
  const toonRepeated = encode(repeatedStructures);
  console.log('TOON Format:');
  console.log(`   Token estimate: ${estimateTokens(toonRepeated)} tokens`);
  console.log(`   Character count: ${toonRepeated.length} chars`);
  console.log(`   Size: ${(toonRepeated.length / 1024).toFixed(2)} KB\n`);

  const tokenSavings = estimateTokens(jsonRepeated) - estimateTokens(toonRepeated);
  const savingsPercent = ((tokenSavings / estimateTokens(jsonRepeated)) * 100).toFixed(1);

  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log(`💡 Token Savings (repeated): ${tokenSavings} tokens (${savingsPercent}%)`);
  console.log(`   This is where TOON's CSV-like format shines!\n`);
  console.log('─────────────────────────────────────────────────────────────────\n');
}

// ==============================================================================
// MAIN
// ==============================================================================

async function main() {
  console.clear();

  try {
    // Run format comparison
    await runComparisonTest();

    // Run multiple task test
    await runMultipleTaskTest();

    // Run large dataset test
    await runLargeDatasetTest();

    // Run nested object test
    await runNestedObjectTest();

    // Run repeated structure test
    await runRepeatedStructureTest();

    // Run LLM tests
    await runLLMTest();

    console.log('\n✅ Experiment complete!\n');

  } catch (error) {
    console.error('\n❌ Error running experiment:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  runComparisonTest,
  runLLMTest,
  runMultipleTaskTest,
  runLargeDatasetTest,
  runNestedObjectTest,
  runRepeatedStructureTest
};
