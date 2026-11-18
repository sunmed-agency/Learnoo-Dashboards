const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

function load(name, dependencies = {}) {
  const path = `${__dirname}/${name}.ts`;
  const source = readFileSync(path, 'utf8').replace('import.meta.url', JSON.stringify(pathToFileURL(path).href));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(id => dependencies[id], module, module.exports);
  return module.exports;
}

test('PDF preserves reading order and choices in left-to-right and right-to-left questions', async () => {
  const located = (str, x, y, dir = 'ltr') => ({ str, dir, transform: [1, 0, 0, 1, x, y], width: str.length * 5, height: 12 });
  const items = [
    located('1. English question', 72, 700), located('?', 175, 700),
    located('A continuation of the question.', 72, 680),
    located('a: Yes', 72, 660), located('b) No', 72, 640),
    located('سؤال؟', 450, 620, 'rtl'), located('.', 520, 620), located('٢', 530, 620, 'rtl'),
    located('واحد', 460, 600, 'rtl'), located('(', 520, 600), located('أ', 530, 600, 'rtl'),
    located('اثنان', 460, 580, 'rtl'), located('(', 520, 580), located('ب', 530, 580, 'rtl'),
  ];
  const pdfjs = {
    GlobalWorkerOptions: {},
    Util: { transform: (_, transform) => transform },
    getDocument: () => ({ promise: Promise.resolve({
      numPages: 1, destroy: async () => {},
      getPage: async () => ({
        view: [0, 0, 612, 792],
        getViewport: () => ({ width: 612, height: 792 }),
        render: () => ({ promise: Promise.resolve() }),
        getTextContent: async () => ({ items }),
      }),
    }) }),
  };
  const { readPdfExam } = load('exam-import-pdf', { 'pdfjs-dist': pdfjs, './exam-import': load('exam-import') });
  const originalDocument = global.document;
  global.document = { createElement: () => ({ getContext: () => ({ getImageData: () => ({ data: Uint8Array.of(255, 255, 255, 255) }) }) }) };
  try {
    const exam = await readPdfExam(new ArrayBuffer(0));
    assert.deepEqual(exam.questions.map(q => [q.text, q.answers.map(a => a.text)]), [
      ['English question? A continuation of the question.', ['Yes', 'No']],
      ['سؤال؟', ['واحد', 'اثنان']],
    ]);
    assert.deepEqual(exam.review, [1, 2]);
  } finally {
    global.document = originalDocument;
  }
});
