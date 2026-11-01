import { boot } from './boot.js';
import { ScrollSequence } from './sequence.js';

boot( '.rfseq[data-rfseq]', ScrollSequence, 'scroll-sequence' );
