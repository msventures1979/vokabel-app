// Englisch, Unit 1 "Station 1" und "Listening", Vokabelteil S. 232–233 (Lehrbuch S. 14–19).
// Beispielsätze mit (*) sind selbst ergänzt, alle anderen stammen aus dem Buch.
import type { Word, WordList } from '../logic/types'

export const unit1Station1: WordList = { id: 'en-u1s1', title: 'Unit 1 – Station 1', subject: 'Englisch' }

type Raw = Omit<Word, 'id' | 'listId' | 'order'> & { key: string }

const raw: Raw[] = [
  // S. 14
  { key: 'at', en: 'at', answers: ['at'], de: 'in; an; um; bei; auf', ipa: 'æt', example: 'I am at school. (*)', cloze: 'I am ___ school.', note: 'at school = in der Schule' },
  { key: 'good-morning', en: 'Good morning.', answers: ['Good morning'], de: 'Guten Morgen.', ipa: 'ˌgʊd ˈmɔːnɪŋ', example: 'Good morning. Welcome to TTS.', cloze: '___. Welcome to TTS.' },
  { key: 'boy', en: 'boy', answers: ['boy'], de: 'der Junge', ipa: 'bɔɪ', example: 'Elliot is a boy.', cloze: 'Elliot is a ___.' },
  { key: 'girl', en: 'girl', answers: ['girl'], de: 'das Mädchen', ipa: 'gɜːl', example: 'Nisha is a girl.', cloze: 'Nisha is a ___.' },
  { key: 'look-at', en: 'to look at', answers: ['to look at', 'look at'], de: 'anschauen', ipa: 'ˈlʊk ət', example: 'Look at this, please!', cloze: '___ this, please!' },
  { key: 'board', en: 'board', answers: ['board'], de: 'die Tafel', ipa: 'bɔːd', example: 'Look at the board, please. (*)', cloze: 'Look at the ___, please.' },
  { key: 'can-you-help-me', en: 'Can you help me?', answers: ['Can you help me'], de: 'Können Sie mir helfen?; Kannst du mir helfen?', ipa: 'kæn jə ˈhelp miː', example: 'Katie, can you help me, please?', cloze: 'Katie, ___, please?' },
  { key: 'yes', en: 'yes', answers: ['yes'], de: 'ja', ipa: 'jes', example: 'Yes, Mrs Bashir is my teacher.', cloze: '___, Mrs Bashir is my teacher.' },
  { key: 'of-course', en: 'of course', answers: ['of course'], de: 'natürlich; selbstverständlich', ipa: 'əv ˈkɔːs', example: 'Of course I can help you.', cloze: '___ I can help you.' },
  { key: 'no', en: 'no', answers: ['no'], de: 'nein; kein / keine', ipa: 'nəʊ', example: 'No, sorry. (*)', cloze: '___, sorry.', note: 'Gegenteil: yes' },
  { key: 'sorry', en: 'Sorry.', answers: ['Sorry'], de: 'Tut mir leid.; Entschuldigung.', ipa: 'ˈsɒri', example: 'Sorry, Mr Turner.', cloze: '___, Mr Turner.' },
  { key: 'sit-down', en: 'to sit down', answers: ['to sit down', 'sit down'], de: 'sich hinsetzen; sich setzen', ipa: 'sɪt ˈdaʊn', example: 'Sit down, please, boys and girls.', cloze: '___, please, boys and girls.' },
  // S. 233
  { key: 'be', en: 'to be', answers: ['to be', 'be'], de: 'sein', ipa: 'biː', example: 'Be quiet in class, please.', cloze: '___ quiet in class, please.', note: 'be: I am, you are, he is, she is' },
  { key: 'quiet', en: 'quiet', answers: ['quiet'], de: 'ruhig; leise; still', ipa: 'ˈkwaɪət', example: 'Be quiet in class, please.', cloze: 'Be ___ in class, please.' },
  { key: 'listen', en: 'to listen (to)', answers: ['to listen', 'listen', 'to listen to', 'listen to'], de: 'zuhören; anhören; hören', ipa: 'ˈlɪsn (tə)', example: 'Listen to the teacher, please. (*)', cloze: '___ to the teacher, please.', note: 'Das t wird nicht gesprochen.' },
  { key: 'dont-talk', en: "Don't talk.", answers: ["Don't talk", 'Do not talk'], de: 'Sei(d) still.; Rede(t) nicht.', ipa: 'ˌdəʊnt ˈtɔːk', example: "Don't talk in class, please. (*)", cloze: '___ in class, please.', note: 'Das l in talk wird nicht gesprochen.' },
  { key: 'here', en: 'here', answers: ['here'], de: 'hier', ipa: 'hɪə', example: 'My bag is here. (*)', cloze: 'My bag is ___.', note: 'Achtung Schreibweise: here' },
  { key: 'book', en: 'book', answers: ['book'], de: 'das Buch; das Heft', ipa: 'bʊk', example: 'This is my new English book.', cloze: 'This is my new English ___.' },
  { key: 'excuse-me', en: 'Excuse me!', answers: ['Excuse me'], de: 'Entschuldigung! (wenn man jemanden anspricht)', ipa: 'ɪkˈskjuːz mi', example: 'Excuse me, can you help me, please?', cloze: '___, can you help me, please?' },
  { key: 'have', en: 'to have', answers: ['to have', 'have'], de: 'haben', ipa: 'hæv', example: 'Can I have that book, please?', cloze: 'Can I ___ that book, please?' },
  { key: 'an', en: 'an', answers: ['an'], de: 'ein / eine (vor a, e, i, o, u)', ipa: 'ən', example: 'an English teacher, an orange book', cloze: 'I have ___ orange book.', note: 'an English teacher – aber: a science teacher' },
  { key: 'pen', en: 'pen', answers: ['pen'], de: 'der Füller; der Stift', ipa: 'pen', example: 'I have an orange pen.', cloze: 'I have an orange ___.' },
  { key: 'here-you-are', en: 'Here you are.', answers: ['Here you are'], de: 'Bitte schön.', ipa: 'ˌhɪə ju ˈɑː', example: 'Can I have a pen, please? – Here you are.', cloze: 'Can I have a pen, please? – ___.' },
  { key: 'bag', en: 'bag', answers: ['bag'], de: 'die Tasche; die Tüte', ipa: 'bæg', example: 'This is my school bag.', cloze: 'This is my school ___.' },
  { key: 'folder', en: 'folder', answers: ['folder'], de: 'der Ordner; die Mappe', ipa: 'ˈfəʊldə', example: 'This is my new music folder.', cloze: 'This is my new music ___.' },
  { key: 'exercise-book', en: 'exercise book', answers: ['exercise book'], de: 'das Übungsheft', ipa: 'ˈeksəsaɪz bʊk', example: 'My English exercise book is red.', cloze: 'My English ___ is red.' },
  { key: 'phone', en: 'phone', answers: ['phone'], de: 'das Handy; das Telefon', ipa: 'fəʊn', example: 'My phone is in my folder.', cloze: 'My ___ is in my folder.' },
  { key: 'tablet', en: 'tablet', answers: ['tablet'], de: 'das Tablet', ipa: 'ˈtæblət', example: 'My new tablet is grey.', cloze: 'My new ___ is grey.' },
  { key: 'pencil', en: 'pencil', answers: ['pencil'], de: 'der Bleistift; der Buntstift', ipa: 'ˈpensl', example: 'I have ten pencils in my bag.', cloze: 'I have ten ___s in my bag.' },
  { key: 'scissors', en: 'pair of scissors', answers: ['pair of scissors', 'a pair of scissors', 'scissors'], de: 'die Schere', ipa: 'ˌpeər əv ˈsɪzəz', example: 'Can I have a pair of scissors, please?', cloze: 'Can I have a ___, please?' },
  { key: 'sharpener', en: 'sharpener', answers: ['sharpener'], de: 'der Spitzer', ipa: 'ˈʃɑːpnə', example: 'Where is my sharpener? – In your bag.', cloze: 'Where is my ___? – In your bag.' },
  { key: 'rubber', en: 'rubber', answers: ['rubber'], de: 'der Radiergummi', ipa: 'ˈrʌbə', example: 'My rubber is blue and red.', cloze: 'My ___ is blue and red.' },
  { key: 'ruler', en: 'ruler', answers: ['ruler'], de: 'das Lineal', ipa: 'ˈruːlə', example: 'Can I have your ruler, please?', cloze: 'Can I have your ___, please?' },
  { key: 'pencil-case', en: 'pencil case', answers: ['pencil case'], de: 'das Federmäppchen', ipa: 'ˈpensl keɪs', example: 'My pencil case is in my bag.', cloze: 'My ___ is in my bag.' },
  { key: 'for', en: 'for', answers: ['for'], de: 'für', ipa: 'fɔː', example: 'This pen is for you. (*)', cloze: 'This pen is ___ you.', note: 'Achtung Schreibweise: for' },
  // S. 16
  { key: 'close', en: 'to close', answers: ['to close', 'close'], de: 'schließen; zumachen', ipa: 'kləʊz', example: 'Close your books, please.', cloze: '___ your books, please.' },
  { key: 'open', en: 'to open', answers: ['to open', 'open'], de: 'öffnen; aufmachen', ipa: 'ˈəʊpn', example: 'Open your books, please. (*)', cloze: '___ your books, please.', note: 'Gegenteil: to close' },
  { key: 'again', en: 'again', answers: ['again'], de: 'noch einmal; wieder', ipa: 'əˈgen', example: 'Say that again, please.', cloze: 'Say that ___, please.' },
  { key: 'write', en: 'to write', answers: ['to write', 'write'], de: 'schreiben', ipa: 'raɪt', example: 'Write your name, please. (*)', cloze: '___ your name, please.' },
  { key: 'on', en: 'on', answers: ['on'], de: 'an; auf', ipa: 'ɒn', example: 'My name is on the board.', cloze: 'My name is ___ the board.' },
  { key: 'take-out', en: 'to take out', answers: ['to take out', 'take out'], de: 'herausnehmen; herausbringen', ipa: 'ˌteɪk ˈaʊt', example: 'Take out your books, please.', cloze: '___ your books, please.' },
  // Listening, S. 19
  { key: 'rule', en: 'rule', answers: ['rule'], de: 'die Regel', ipa: 'ruːl', example: 'Look at the school rules.', cloze: 'Look at the school ___s.' },
  { key: 'classroom', en: 'classroom', answers: ['classroom'], de: 'das Klassenzimmer', ipa: 'ˈklɑːsrʊm', example: 'Mr Turner is in the classroom.', cloze: 'Mr Turner is in the ___.' },
]

export const unit1Station1Words: Word[] = raw.map(({ key, ...w }, i) => ({ ...w, id: `${unit1Station1.id}:${key}`, listId: unit1Station1.id, order: i }))
