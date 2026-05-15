/**
 * AlgoFlow seed script
 * Run with: npx tsx src/db/seed.ts
 *
 * Seeds:
 *   - All 9 patterns (only Arrays & Hashing published)
 *   - All 5 Arrays & Hashing problems with full step content
 *   - Remaining 20 problems as stubs (is_published: false)
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { patterns, problems } from './schema'
import type { Step, ProblemExample } from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db     = drizzle(client)

// ─── Patterns ─────────────────────────────────────────────────────────────────

const PATTERNS = [
  { slug: 'arrays-hashing',  title: 'Arrays & Hashing',  sortOrder: 1, isPublished: true  },
  { slug: 'two-pointers',    title: 'Two Pointers',       sortOrder: 2, isPublished: false },
  { slug: 'sliding-window',  title: 'Sliding Window',     sortOrder: 3, isPublished: false },
  { slug: 'stack',           title: 'Stack',              sortOrder: 4, isPublished: false },
  { slug: 'binary-search',   title: 'Binary Search',      sortOrder: 5, isPublished: false },
  { slug: 'linked-list',     title: 'Linked List',        sortOrder: 6, isPublished: false },
  { slug: 'trees',           title: 'Trees',              sortOrder: 7, isPublished: false },
  { slug: 'heap',            title: 'Heap',               sortOrder: 8, isPublished: false },
  { slug: 'graphs',          title: 'Graphs',             sortOrder: 9, isPublished: false },
]

// ─── Problem statements & examples ────────────────────────────────────────────

const twoSumStatement =
  'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume exactly one solution exists, and you may not use the same element twice.'

const twoSumExamples: ProblemExample[] = [
  {
    input:  'nums = [2,7,11,15], target = 9',
    output: '[0,1]',
    explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
  },
  {
    input:  'nums = [3,2,4], target = 6',
    output: '[1,2]',
  },
]

const groupAnagramsStatement =
  'Given an array of strings strs, group the anagrams together and return them in any order. Two strings are anagrams if one can be rearranged to form the other using all original characters exactly once.'

const groupAnagramsExamples: ProblemExample[] = [
  {
    input:  'strs = ["eat","tea","tan","ate","nat","bat"]',
    output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
  },
  {
    input:  'strs = [""]',
    output: '[[""]]',
  },
  {
    input:  'strs = ["a"]',
    output: '[["a"]]',
  },
]

const productArrayStatement =
  'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements of nums except nums[i]. You must solve it in O(n) time without using the division operation.'

const productArrayExamples: ProblemExample[] = [
  {
    input:  'nums = [1,2,3,4]',
    output: '[24,12,8,6]',
  },
  {
    input:  'nums = [-1,1,0,-3,3]',
    output: '[0,0,9,0,0]',
  },
]

const longestConsecutiveStatement =
  'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.'

const longestConsecutiveExamples: ProblemExample[] = [
  {
    input:  'nums = [100,4,200,1,3,2]',
    output: '4',
    explanation: 'The longest consecutive sequence is [1,2,3,4]',
  },
  {
    input:  'nums = [0,3,7,2,5,8,4,6,0,1]',
    output: '9',
  },
]

const validSudokuStatement =
  'Determine if a 9x9 Sudoku board is valid. A board is valid if each row, each column, and each of the nine 3x3 sub-boxes contains the digits 1-9 with no repetition. Empty cells are represented by ".".'

const validSudokuExamples: ProblemExample[] = [
  {
    input:  'board = [["5","3",".",…],["6",".",".","1","9","5",…],…]',
    output: 'true',
  },
  {
    input:  'board = [["8","3",".",…],…] (8 appears twice in top-left box)',
    output: 'false',
  },
]

// ─── Steps: Two Sum ───────────────────────────────────────────────────────────

const twoSumSteps: Step[] = [
  {
    type:   'clarifying',
    tag:    'Choose the right questions',
    prompt: 'Before writing a line of code, which questions actually matter for this problem?',
    sub:    'Select all that apply.',
    multi:  true,
    options: [
      { text: 'Can the array contain negative numbers?',     correct: true  },
      { text: 'Is there always exactly one valid answer?',   correct: true  },
      { text: 'Can I use the same element twice?',           correct: true  },
      { text: 'Does the output order of indices matter?',    correct: false },
      { text: 'Should the array be sorted first?',           correct: false },
      { text: 'What should I return if no solution exists?', correct: true  },
    ],
    feedback: {
      ok:  "Exactly. Knowing there's exactly one answer means you can return immediately on first match. Knowing you can't reuse elements prevents bugs with nums[i] + nums[i] = target.",
      bad: "Output order and pre-sorting don't affect correctness here — the problem guarantees one answer and indices can be in any order.",
    },
  },
  {
    type:   'algorithm',
    tag:    'Pick the right algorithm',
    prompt: 'Which approach finds the two indices that sum to target most efficiently?',
    multi:  false,
    options: [
      { text: "Use a hashmap: store each number's index as you iterate, check if complement exists", correct: true  },
      { text: 'Sort the array, then use two pointers from each end',                                 correct: false },
      { text: 'Nested loops: check every pair (i, j) where i != j',                                 correct: false },
      { text: 'Binary search for the complement of each element',                                    correct: false },
    ],
    feedback: {
      ok:  "Right. One pass, O(n) time, O(n) space. For each number check if (target - num) is already in the map — if yes, you're done.",
      bad: 'Sorting loses original indices. Nested loops are O(n^2). Binary search is O(n log n) but tricky with duplicate indices — the hashmap is cleaner and faster.',
    },
  },
  {
    type:   'fillin',
    tag:    'Fill in the blanks',
    prompt: 'Complete the hashmap solution.',
    code: [
      { t: 'def twoSum(nums, target):\n    seen = ' },
      { blank: 0, label: '___', answer: '{}' },
      { t: '\n    for i, num in ' },
      { blank: 1, label: '___', answer: 'enumerate(nums)' },
      { t: ':\n        complement = ' },
      { blank: 2, label: '___', answer: 'target - num' },
      { t: '\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i' },
    ],
    tokens: [
      '{}', 'enumerate(nums)', 'target - num',
      '[]', 'range(len(nums))', 'num - target', 'seen',
    ],
    feedback: {
      ok:  "Perfect. seen maps number to index. You compute the complement before checking — that's the key insight. Return immediately when found.",
      bad: "Remember: the map stores num -> index (not index -> num). Check for the complement before adding the current number to the map.",
    },
  },
  {
    type:   'complexity',
    tag:    'Select the correct complexity',
    prompt: 'What is the time and space complexity of the hashmap solution?',
    multi:  false,
    options: [
      { text: 'Time O(n), Space O(n) — one pass, hashmap stores up to n entries',  correct: true  },
      { text: 'Time O(n log n), Space O(1) — sorting dominates, no extra space',    correct: false },
      { text: 'Time O(n^2), Space O(1) — checking every pair, no extra space',      correct: false },
      { text: 'Time O(n), Space O(1) — one pass, no extra data structure needed',   correct: false },
    ],
    feedback: {
      ok:  "Correct. Each element is visited once O(n) and in the worst case we store n-1 entries in the hashmap before finding the answer — O(n) space.",
      bad: "You can't do this in O(1) space with a single pass — you need somewhere to store the numbers you've already seen. That's the whole point of the hashmap.",
    },
  },
]

// ─── Steps: Group Anagrams ────────────────────────────────────────────────────

const groupAnagramsSteps: Step[] = [
  {
    type:   'clarifying',
    tag:    'Choose the right questions',
    prompt: 'Which questions help you nail the edge cases before coding?',
    sub:    'Select all that apply.',
    multi:  true,
    options: [
      { text: 'Are all characters lowercase English letters?', correct: true  },
      { text: 'Can the input contain empty strings?',          correct: true  },
      { text: 'Should each group be internally sorted?',       correct: false },
      { text: 'Can two words in the input be identical?',      correct: true  },
      { text: 'Does the order of groups in output matter?',    correct: false },
      { text: 'What if the input array is empty?',             correct: true  },
    ],
    feedback: {
      ok:  'Spot on. Lowercase-only means sorting is safe and O(k log k). Empty strings are valid anagrams of each other — return [[""]] not []. Duplicate words land in the same group.',
      bad: "Output group order doesn't matter — any grouping is valid. Internal sort order within a group also doesn't matter.",
    },
  },
  {
    type:   'algorithm',
    tag:    'Pick the right algorithm',
    prompt: 'Which approach correctly groups anagrams together?',
    multi:  false,
    options: [
      { text: 'Sort each word -> use sorted form as hashmap key -> group words under same key', correct: true  },
      { text: 'Compare every pair of words character by character -> group if they match',      correct: false },
      { text: 'Sort the entire list alphabetically -> adjacent words are anagrams',             correct: false },
      { text: 'Use a set to deduplicate, then group remaining words by length',                 correct: false },
    ],
    feedback: {
      ok:  'Exactly. Sorting gives a canonical form — "eat", "tea", and "ate" all become "aet". That\'s your hashmap key. O(n * k log k) total.',
      bad: 'Pairwise comparison is O(n^2 * k). Sorting the full list alphabetically doesn\'t isolate anagram groups — "bat" and "tan" would be adjacent but aren\'t anagrams.',
    },
  },
  {
    type:   'fillin',
    tag:    'Fill in the blanks',
    prompt: 'Complete the implementation.',
    code: [
      { t: 'from collections import defaultdict\n\ndef groupAnagrams(strs):\n    result = ' },
      { blank: 0, label: '___', answer: 'defaultdict(list)' },
      { t: '\n    for s in strs:\n        key = ' },
      { blank: 1, label: '___', answer: '"".join(sorted(s))' },
      { t: '\n        result[key].append(s)\n    return ' },
      { blank: 2, label: '___', answer: 'list(result.values())' },
    ],
    tokens: [
      'defaultdict(list)', '"".join(sorted(s))', 'list(result.values())',
      'defaultdict(set)', 'sorted(s)', 'list(result.keys())', '{}',
    ],
    feedback: {
      ok:  "Clean. defaultdict(list) auto-initializes each key with an empty list — no setdefault or if-check needed. result.values() gives you all the groups.",
      bad: "defaultdict(list) is the right data structure — it creates a new list automatically for each new key. result.values() gives the grouped lists, not result.keys().",
    },
  },
  {
    type:   'complexity',
    tag:    'Select the correct complexity',
    prompt: 'n = number of words, k = max word length. What is the time complexity?',
    multi:  false,
    options: [
      { text: 'O(n * k log k) — sorting each word of length k dominates', correct: true  },
      { text: 'O(n^2) — comparing every pair of words',                    correct: false },
      { text: 'O(n log n) — sorting the list of n words',                  correct: false },
      { text: 'O(n * k) — iterating through characters once per word',     correct: false },
    ],
    feedback: {
      ok:  "Right. Sorting one word is O(k log k). We do it for all n words -> O(n * k log k). Hashmap insertions are O(1) amortized and don't dominate.",
      bad: "We're not comparing pairs (O(n^2 * k)). We're not sorting the list of words (O(n log n)). The bottleneck is sorting each individual word.",
    },
  },
]

// ─── Steps: Product of Array Except Self ─────────────────────────────────────

const productArraySteps: Step[] = [
  {
    type:   'clarifying',
    tag:    'Choose the right questions',
    prompt: 'What do you need to know before you start?',
    sub:    'Select all that apply.',
    multi:  true,
    options: [
      { text: 'Can the array contain zeros?',                              correct: true  },
      { text: 'Can I use division to compute the answer?',                 correct: true  },
      { text: 'What is the minimum array length?',                         correct: false },
      { text: 'Should I solve it without using the division operation?',   correct: true  },
      { text: 'Can numbers be negative?',                                   correct: true  },
      { text: 'Does the output array need to be sorted?',                  correct: false },
    ],
    feedback: {
      ok:  "Great. Zeros break the division trick entirely. The no-division constraint is the whole challenge — it forces the prefix/suffix approach. Negatives work fine with multiplication.",
      bad: "The output is never sorted — it maps 1-to-1 with input positions. Min length doesn't affect the algorithm design.",
    },
  },
  {
    type:   'algorithm',
    tag:    'Pick the right algorithm',
    prompt: 'Which approach computes the product of all elements except self, without division?',
    multi:  false,
    options: [
      { text: 'Build a prefix product array and a suffix product array, multiply them per index', correct: true  },
      { text: 'Compute total product, divide by nums[i] for each index',                          correct: false },
      { text: 'For each index, multiply all other elements with a nested loop',                    correct: false },
      { text: 'Sort the array and use two pointers from each end',                                 correct: false },
    ],
    feedback: {
      ok:  "Exactly. prefix[i] = product of everything left of i. suffix[i] = product of everything right of i. result[i] = prefix[i] * suffix[i]. No division needed.",
      bad: "Division fails when the array contains zeros. Nested loops are O(n^2). Sorting destroys the original positions you need to output.",
    },
  },
  {
    type:   'fillin',
    tag:    'Fill in the blanks',
    prompt: 'Complete the prefix/suffix solution.',
    code: [
      { t: 'def productExceptSelf(nums):\n    n = len(nums)\n    result = ' },
      { blank: 0, label: '___', answer: '[1] * n' },
      { t: '\n    prefix = 1\n    for i in range(n):\n        result[i] = ' },
      { blank: 1, label: '___', answer: 'prefix' },
      { t: '\n        prefix *= nums[i]\n\n    suffix = 1\n    for i in ' },
      { blank: 2, label: '___', answer: 'range(n-1, -1, -1)' },
      { t: ':\n        result[i] *= suffix\n        suffix *= nums[i]\n    return result' },
    ],
    tokens: [
      '[1] * n', 'prefix', 'range(n-1, -1, -1)',
      '[0] * n', 'result[i]', 'range(n)', 'suffix',
    ],
    feedback: {
      ok:  "Perfect. The forward pass fills result[i] with the product of everything to the left. The reverse pass multiplies in everything to the right. O(n) time, O(1) extra space.",
      bad: "The forward pass stores prefix BEFORE multiplying nums[i] — that way result[i] doesn't include nums[i] itself. The reverse loop must go from n-1 down to 0.",
    },
  },
  {
    type:   'complexity',
    tag:    'Select the correct complexity',
    prompt: 'What is the time and space complexity of the prefix/suffix approach?',
    multi:  false,
    options: [
      { text: 'Time O(n), Space O(1) extra — two passes, only scalar variables added', correct: true  },
      { text: 'Time O(n), Space O(n) — two extra arrays needed',                        correct: false },
      { text: 'Time O(n^2), Space O(1) — nested loops, no extra space',                 correct: false },
      { text: 'Time O(n log n), Space O(n) — sorting plus extra arrays',               correct: false },
    ],
    feedback: {
      ok:  "Correct. The output array is required by the problem so it doesn't count as extra space. The prefix and suffix passes each use a single integer — O(1) extra.",
      bad: "The naive approach using two separate prefix/suffix arrays is O(n) space. The optimized version reuses the output array and two scalar variables — O(1) extra space.",
    },
  },
]

// ─── Steps: Longest Consecutive Sequence ─────────────────────────────────────

const longestConsecutiveSteps: Step[] = [
  {
    type:   'clarifying',
    tag:    'Choose the right questions',
    prompt: 'What clarifications change how you approach this?',
    sub:    'Select all that apply.',
    multi:  true,
    options: [
      { text: 'Can the array contain duplicates?',                correct: true  },
      { text: 'Must the solution run in O(n) time?',              correct: true  },
      { text: 'Can numbers be negative?',                          correct: true  },
      { text: 'Is the array already sorted?',                     correct: false },
      { text: 'What if the array is empty?',                      correct: true  },
      { text: 'Should I return the sequence or just its length?', correct: false },
    ],
    feedback: {
      ok:  "Good. Duplicates mean you should deduplicate (a set handles this). The O(n) constraint rules out sorting. Negatives work fine. Empty array -> return 0.",
      bad: "The array is not guaranteed sorted — if it were, the problem would be trivial. The problem asks for the length, not the sequence itself.",
    },
  },
  {
    type:   'algorithm',
    tag:    'Pick the right algorithm',
    prompt: 'Which approach finds the longest consecutive sequence in O(n) time?',
    multi:  false,
    options: [
      { text: 'Put all numbers in a set; for each number where n-1 is absent, count the sequence forward', correct: true  },
      { text: 'Sort the array, then scan for the longest run of consecutive numbers',                       correct: false },
      { text: 'For every number, use a nested loop to count how long its streak goes',                      correct: false },
      { text: 'Use a hashmap counting occurrences, then find the longest key streak',                       correct: false },
    ],
    feedback: {
      ok:  "Exactly. The key insight: only start counting from the beginning of a sequence (where n-1 is absent). Each number is visited at most twice — once as a potential start, once during a count. O(n) total.",
      bad: "Sorting is O(n log n) — violates the constraint. Nested loops are O(n^2). A frequency map doesn't help because you still need to detect sequence starts efficiently.",
    },
  },
  {
    type:   'fillin',
    tag:    'Fill in the blanks',
    prompt: 'Complete the O(n) set-based solution.',
    code: [
      { t: 'def longestConsecutive(nums):\n    num_set = ' },
      { blank: 0, label: '___', answer: 'set(nums)' },
      { t: '\n    best = 0\n    for n in num_set:\n        if ' },
      { blank: 1, label: '___', answer: 'n - 1 not in num_set' },
      { t: ':\n            length = 1\n            while ' },
      { blank: 2, label: '___', answer: 'n + length in num_set' },
      { t: ':\n                length += 1\n            best = ' },
      { blank: 3, label: '___', answer: 'max(best, length)' },
      { t: '\n    return best' },
    ],
    tokens: [
      'set(nums)', 'n - 1 not in num_set', 'n + length in num_set', 'max(best, length)',
      'list(nums)', 'n not in num_set', 'n + 1 in num_set', 'min(best, length)',
    ],
    feedback: {
      ok:  "Clean. Iterating over num_set skips duplicates automatically. The n-1 check is what makes this O(n) — you only ever count forward from a true sequence start.",
      bad: "Make sure you iterate over num_set, not nums (to skip duplicates). The sequence-start check is n-1 not in num_set — you want to know if there's nothing before n.",
    },
  },
  {
    type:   'complexity',
    tag:    'Select the correct complexity',
    prompt: "Why is this O(n) even though there's a while loop inside a for loop?",
    multi:  false,
    options: [
      { text: "Each number is a 'start' at most once and counted forward at most once — total work is 2n", correct: true  },
      { text: 'The while loop always runs a constant number of iterations',                                 correct: false },
      { text: 'The set lookup makes each iteration O(1), so n iterations = O(n)',                          correct: false },
      { text: "It's actually O(n^2) in the worst case — the nested loop can't be O(n)",                    correct: false },
    ],
    feedback: {
      ok:  "Correct. Amortized analysis: each number is touched at most twice — once in the outer for loop, at most once inside a while loop. Total touches <= 2n -> O(n).",
      bad: "The while loop does NOT always run constant iterations. But any given number can only be inside one sequence, so across all iterations the while loop runs at most n times total.",
    },
  },
]

// ─── Steps: Valid Sudoku ──────────────────────────────────────────────────────

const validSudokuSteps: Step[] = [
  {
    type:   'clarifying',
    tag:    'Choose the right questions',
    prompt: 'What do you need to clarify before validating a Sudoku board?',
    sub:    'Select all that apply.',
    multi:  true,
    options: [
      { text: "Do empty cells ('.') count as valid?",                               correct: true  },
      { text: 'Does the board need to be solvable, or just valid?',                 correct: true  },
      { text: 'Is the board always 9x9?',                                            correct: false },
      { text: 'What are the three rule sets I need to check?',                      correct: true  },
      { text: "Can a row contain the same number twice if it's in a different box?", correct: false },
    ],
    feedback: {
      ok:  "Exactly. '.' cells are skipped. Validity (no duplicates) is different from solvability. The three rule sets are: each row, each column, each 3x3 box.",
      bad: "The board is always 9x9 — no need to ask. And no: a number can't appear twice in the same row regardless of which box it's in.",
    },
  },
  {
    type:   'algorithm',
    tag:    'Pick the right algorithm',
    prompt: 'Which data structure most cleanly tracks duplicates across rows, columns, and boxes?',
    multi:  false,
    options: [
      { text: 'Three dicts of sets: rows[i], cols[j], boxes[(i//3, j//3)] — each tracks seen digits', correct: true  },
      { text: 'Sort each row, column, and box then scan for adjacent duplicates',                       correct: false },
      { text: 'Three 9x9 boolean matrices, one per rule type',                                          correct: false },
      { text: 'A single pass with a counter array; return false if any count exceeds 1',               correct: false },
    ],
    feedback: {
      ok:  "Right. Dicts of sets are clean and O(1) per lookup. The box key (i//3, j//3) maps any cell to its 3x3 box index — that's the key insight.",
      bad: "Sorting destroys position info. Boolean matrices work but are verbose. A single counter array can't track all three rule types simultaneously without resetting between checks.",
    },
  },
  {
    type:   'fillin',
    tag:    'Fill in the blanks',
    prompt: 'Complete the validation using sets.',
    code: [
      { t: 'def isValidSudoku(board):\n    rows = cols = boxes = ' },
      { blank: 0, label: '___', answer: 'defaultdict(set)' },
      { t: '\n    for i in range(9):\n        for j in range(9):\n            val = board[i][j]\n            if val == ".": continue\n            box_key = ' },
      { blank: 1, label: '___', answer: '(i//3, j//3)' },
      { t: '\n            if (val in rows[i] or val in cols[j] or val in boxes[box_key]):\n                return False\n            ' },
      { blank: 2, label: '___', answer: 'rows[i].add(val)' },
      { t: '\n            cols[j].add(val)\n            boxes[box_key].add(val)\n    return True' },
    ],
    tokens: [
      'defaultdict(set)', '(i//3, j//3)', 'rows[i].add(val)',
      'defaultdict(list)', '(i%3, j%3)', 'rows[i].append(val)', 'set()',
    ],
    feedback: {
      ok:  "Great. defaultdict(set) auto-initializes each row/col/box. The box key (i//3, j//3) is the elegant part — integer division maps 0-8 to 0-2 for both axes.",
      bad: "i%3 gives position within a box, not the box index — you want i//3. And rows[i].add(val) is the correct set method, not append.",
    },
  },
  {
    type:   'complexity',
    tag:    'Select the correct complexity',
    prompt: 'What is the time and space complexity of this solution?',
    multi:  false,
    options: [
      { text: 'Time O(1), Space O(1) — the board is always fixed at 9x9 = 81 cells', correct: true  },
      { text: 'Time O(n^2), Space O(n^2) — iterating all cells of an n x n board',    correct: false },
      { text: 'Time O(81), Space O(243) — technically correct but non-standard',       correct: false },
      { text: 'Time O(n), Space O(n) — linear in the number of filled cells',          correct: false },
    ],
    feedback: {
      ok:  "Correct — and this is subtle. Because the board is always exactly 9x9, both time and space are bounded by a constant (81 cells, at most 81 entries across all sets). O(1) is precise.",
      bad: "O(81) and O(243) are also correct but it's conventional to simplify constants to O(1) when the input size is fixed. The board never grows beyond 81 cells.",
    },
  },
]

// ─── Stub steps for unpublished problems ──────────────────────────────────────

const STUB_STEPS: Step[] = [
  {
    type:    'algorithm',
    tag:     'Coming soon',
    prompt:  'This problem is not yet available.',
    multi:   false,
    options: [{ text: 'Check back soon!', correct: true }],
    feedback: { ok: '', bad: '' },
  },
]

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding patterns...')

  const insertedPatterns = await db
    .insert(patterns)
    .values(PATTERNS)
    .returning({ id: patterns.id, slug: patterns.slug })
    .onConflictDoUpdate({
      target: patterns.slug,
      set:    { isPublished: patterns.isPublished },
    })

  const patternMap = Object.fromEntries(insertedPatterns.map((p) => [p.slug, p.id]))

  console.log('🌱 Seeding problems...')

  const arraysId = patternMap['arrays-hashing']

  const arraysProblems = [
    {
      patternId:   arraysId,
      slug:        'two-sum',
      title:       'Two Sum',
      difficulty:  'easy'   as const,
      sortOrder:   1,
      xpReward:    40,
      isPublished: true,
      statement:   twoSumStatement,
      examples:    twoSumExamples,
      steps:       twoSumSteps,
    },
    {
      patternId:   arraysId,
      slug:        'group-anagrams',
      title:       'Group Anagrams',
      difficulty:  'medium' as const,
      sortOrder:   2,
      xpReward:    60,
      isPublished: true,
      statement:   groupAnagramsStatement,
      examples:    groupAnagramsExamples,
      steps:       groupAnagramsSteps,
    },
    {
      patternId:   arraysId,
      slug:        'product-of-array-except-self',
      title:       'Product of Array Except Self',
      difficulty:  'medium' as const,
      sortOrder:   3,
      xpReward:    60,
      isPublished: true,
      statement:   productArrayStatement,
      examples:    productArrayExamples,
      steps:       productArraySteps,
    },
    {
      patternId:   arraysId,
      slug:        'longest-consecutive-sequence',
      title:       'Longest Consecutive Sequence',
      difficulty:  'medium' as const,
      sortOrder:   4,
      xpReward:    80,
      isPublished: true,
      statement:   longestConsecutiveStatement,
      examples:    longestConsecutiveExamples,
      steps:       longestConsecutiveSteps,
    },
    {
      patternId:   arraysId,
      slug:        'valid-sudoku',
      title:       'Valid Sudoku',
      difficulty:  'medium' as const,
      sortOrder:   5,
      xpReward:    80,
      isPublished: true,
      statement:   validSudokuStatement,
      examples:    validSudokuExamples,
      steps:       validSudokuSteps,
    },
  ]

  const stubProblems = [
    { slug: 'valid-palindrome',            title: 'Valid Palindrome',                    patternSlug: 'two-pointers',   difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'two-sum-ii',                  title: 'Two Sum II',                          patternSlug: 'two-pointers',   difficulty: 'medium' as const, sortOrder: 2 },
    { slug: '3sum',                        title: '3Sum',                                patternSlug: 'two-pointers',   difficulty: 'medium' as const, sortOrder: 3 },
    { slug: 'container-with-most-water',   title: 'Container With Most Water',           patternSlug: 'two-pointers',   difficulty: 'medium' as const, sortOrder: 4 },
    { slug: 'best-time-to-buy-sell-stock', title: 'Best Time to Buy and Sell Stock',     patternSlug: 'sliding-window', difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'longest-substring-no-repeat', title: 'Longest Substring Without Repeating', patternSlug: 'sliding-window', difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'valid-parentheses',           title: 'Valid Parentheses',                   patternSlug: 'stack',          difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'min-stack',                   title: 'Min Stack',                           patternSlug: 'stack',          difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'binary-search',               title: 'Binary Search',                       patternSlug: 'binary-search',  difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'search-2d-matrix',            title: 'Search a 2D Matrix',                  patternSlug: 'binary-search',  difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'reverse-linked-list',         title: 'Reverse Linked List',                 patternSlug: 'linked-list',    difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'reorder-list',                title: 'Reorder List',                        patternSlug: 'linked-list',    difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'invert-binary-tree',          title: 'Invert Binary Tree',                  patternSlug: 'trees',          difficulty: 'easy'   as const, sortOrder: 1 },
    { slug: 'binary-tree-right-side-view', title: 'Binary Tree Right Side View',         patternSlug: 'trees',          difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'kth-largest-stream',          title: 'Kth Largest Element in a Stream',     patternSlug: 'heap',           difficulty: 'medium' as const, sortOrder: 1 },
    { slug: 'task-scheduler',             title: 'Task Scheduler',                      patternSlug: 'heap',           difficulty: 'medium' as const, sortOrder: 2 },
    { slug: 'number-of-islands',           title: 'Number of Islands',                   patternSlug: 'graphs',         difficulty: 'medium' as const, sortOrder: 1 },
    { slug: 'walls-and-gates',            title: 'Walls and Gates',                     patternSlug: 'graphs',         difficulty: 'medium' as const, sortOrder: 2 },
  ].map((p) => ({
    patternId:   patternMap[p.patternSlug],
    slug:        p.slug,
    title:       p.title,
    difficulty:  p.difficulty,
    sortOrder:   p.sortOrder,
    xpReward:    p.difficulty === 'easy' ? 40 : 60,
    isPublished: false,
    statement:   '',
    examples:    [] as ProblemExample[],
    steps:       STUB_STEPS,
  }))

  await db
    .insert(problems)
    .values([...arraysProblems, ...stubProblems])
    .onConflictDoUpdate({
      target: problems.slug,
      set: {
        statement:   problems.statement,
        examples:    problems.examples,
        steps:       problems.steps,
        isPublished: problems.isPublished,
        xpReward:    problems.xpReward,
      },
    })

  console.log(
    `✅ Seeded ${PATTERNS.length} patterns and ${arraysProblems.length + stubProblems.length} problems`,
  )
  await client.end()
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
