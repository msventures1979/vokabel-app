// Englisch, Unit 1 "School life", S. 12–13. Beispielsätze mit (*) sind selbst ergänzt.
import type { Word, WordList } from '../logic/types'

export const unit1: WordList = { id: 'en-u1', title: 'Unit 1 – School life', subject: 'Englisch' }

type Raw = Omit<Word, 'id' | 'listId' | 'order'> & { key: string }

const raw: Raw[] = [
  { key: 'school', en: 'school', answers: ['school'], de: 'die Schule', ipa: 'skuːl', example: 'My school is old.', cloze: 'My ___ is old.' },
  { key: 'life', en: 'life, lives', answers: ['life'], de: 'das Leben', ipa: 'laɪf, laɪvz', example: 'My life is great.', cloze: 'My ___ is great.', note: 'Mehrzahl: lives (die Leben)' },
  { key: 'go', en: 'to go', answers: ['to go', 'go'], de: 'gehen; fahren', ipa: 'gəʊ', example: 'I go to TTS.', cloze: 'I ___ to TTS.' },
  { key: 'to', en: 'to', answers: ['to'], de: 'in; zu; nach; bis', ipa: 'tʊ', example: 'I go to TTS.', cloze: 'I go ___ TTS.' },
  { key: 'in', en: 'in', answers: ['in'], de: 'in; auf', ipa: 'ɪn', example: "I'm in class 5c.", cloze: "I'm ___ class 5c.", note: 'Wird auch im Deutschen so verwendet.' },
  { key: 'year', en: 'year', answers: ['year'], de: 'die Klasse; die Jahrgangsstufe; das Jahr', ipa: 'jɪə', example: 'Elliot is in Year 7. (*)', cloze: 'Elliot is in ___ 7.', note: 'Year 7 (England) = 5. Klasse (Deutschland)' },
  { key: 'uniform', en: 'uniform', answers: ['uniform'], de: 'die Uniform', ipa: 'ˈjuːnɪfɔːm', example: 'It is my uniform.', cloze: "It's my ___. It is blue.", note: 'Betonung vorne: UNIform' },
  { key: 'its', en: "it's (= it is)", answers: ["it's", 'it is'], de: 'er / sie / es ist', ipa: 'ɪts', example: "It's my uniform. It is blue.", cloze: '___ my uniform. It is blue.' },
  { key: 'ok', en: 'OK', answers: ['OK', 'okay', 'Okay'], de: 'okay', ipa: 'əʊˈkeɪ', example: 'Is it OK? Yes, it is OK. (*)', cloze: 'Is it ___? Yes, it is.', caseSensitive: true },
  { key: 'tutor', en: 'tutor', answers: ['tutor'], de: 'der Klassenlehrer / die Klassenlehrerin', ipa: 'ˈtjuːtə', example: 'That is my tutor.', cloze: 'That is my ___.' },
  { key: 'mr', en: 'Mr', answers: ['Mr', 'Mr.'], de: 'Herr (Anrede)', ipa: 'ˈmɪstə', example: "Mr Turner is Elliot's tutor.", cloze: "___ Turner is Elliot's tutor.", caseSensitive: true },
  { key: 'hes', en: "he's (= he is)", answers: ["he's", 'he is'], de: 'er ist', ipa: 'hiːz', example: "He's my tutor. He is nice.", cloze: '___ my tutor. He is nice.' },
  { key: 'a', en: 'a', answers: ['a'], de: 'ein / eine', ipa: 'ə', example: 'Mr Turner is a tutor.', cloze: 'Mr Turner is ___ tutor.' },
  { key: 'science', en: 'science', answers: ['science'], de: 'Wissenschaft; Naturwissenschaft', ipa: 'ˈsaɪəns', example: 'He is a science teacher.', cloze: 'He is a ___ teacher.' },
  { key: 'teacher', en: 'teacher', answers: ['teacher'], de: 'der Lehrer / die Lehrerin', ipa: 'ˈtiːtʃə', example: "He's my tutor and a science teacher.", cloze: "He's my tutor and a science ___." },
  { key: 'english', en: 'English', answers: ['English'], de: 'Englisch; englisch; aus England', ipa: 'ˈɪŋglɪʃ', example: 'I like English. (*)', cloze: 'I like ___.', note: 'Achtung Schreibweise: immer groß!', caseSensitive: true },
  { key: 'mrs', en: 'Mrs', answers: ['Mrs', 'Mrs.'], de: 'Frau (Anrede)', ipa: 'ˈmɪsɪz', example: 'Mrs Bashir is a teacher.', cloze: '___ Bashir is a teacher.', caseSensitive: true },
  { key: 'shes', en: "she's (= she is)", answers: ["she's", 'she is'], de: 'sie ist', ipa: 'ʃiːz', example: "She's a teacher. She is nice.", cloze: '___ a teacher. She is nice.' },
  { key: 'caretaker', en: 'caretaker', answers: ['caretaker'], de: 'der Hausmeister / die Hausmeisterin', ipa: 'ˈkeəˌteɪkə', example: 'Mrs Warren is the caretaker at TTS.', cloze: 'Mrs Warren is the ___ at TTS.' },
  { key: 'always', en: 'always', answers: ['always'], de: 'immer', ipa: 'ˈɔːlweɪz', example: 'Josh is always nice. (*)', cloze: 'Josh is ___ nice.' },
  { key: 'busy', en: 'busy', answers: ['busy'], de: 'beschäftigt; belebt; arbeitsreich', ipa: 'ˈbɪzi', example: 'The teacher is busy. (*)', cloze: 'The teacher is very ___.', note: 'Achtung Aussprache: wie "bisi"' },
  { key: 'friend', en: 'friend', answers: ['friend'], de: 'der Freund / die Freundin', ipa: 'frend', example: "Josh is Elliot's friend.", cloze: "Josh is Elliot's ___." },
  { key: 'new', en: 'new', answers: ['new'], de: 'neu', ipa: 'njuː', example: 'My uniform is new. (*)', cloze: 'My uniform is ___.' },
  { key: 'class', en: 'class', answers: ['class'], de: 'die Klasse; der Unterricht; der Kurs; die Unterrichtsstunde', ipa: 'klɑːs', example: "I'm in class 5c.", cloze: "I'm in ___ 5c." },
  { key: 'cool', en: 'cool', answers: ['cool'], de: 'cool; super; kühl', ipa: 'kuːl', example: 'My friends are cool.', cloze: 'My friends are ___.' },
  { key: 'music', en: 'music', answers: ['music'], de: 'Musik', ipa: 'ˈmjuːzɪk', example: 'I love music. (*)', cloze: 'I love ___.', note: 'Betonung vorne: MUsic' },
]

export const unit1Words: Word[] = raw.map(({ key, ...w }, i) => ({ ...w, id: `${unit1.id}:${key}`, listId: unit1.id, order: i }))
