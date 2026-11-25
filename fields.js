// Geometria del modulo ACLF186 (coordinate in pixel della pagina A4 a 100 dpi, 1169x827).
// L'area di riferimento e' il riquadro esterno delle due etichette: (64,64) - (1100,755).
const FRAME = {x1:64, y1:64, x2:1100, y2:755};
const ROW = {desc:148,part:189,ser:229,plate:269,manuf:310,owner:350,rem:390,cco:471,cnum:512,sup:552,ord:593,rec:634,end:755};
const V = (x1,y1,x2,y2,o={}) => ({rect:[x1,y1+(o.top??13),x2,y2], ...o});

// side: 'in' = Installation/Serviceable, 'out' = Removal/Unserviceable
const FIELDS = [
 {k:'docnum', side:'in', it:'N. etichetta', en:'Label No.', ...V(300,68,460,112,{top:0}), size:'h', digits:true, nosug:true},
 {k:'matclass', side:'in', it:'Classe materiale', en:'Mat.Class', ...V(1028,64,1100,115,{top:20}), size:'t'},
 {k:'desc', side:'in', it:'Descrizione', en:'Description', ...V(64,ROW.desc,537,ROW.part), size:'f'},
 {k:'part', side:'in', it:'Part number', en:'Partnumber', ...V(64,ROW.part,379,ROW.ser), size:'h'},
 {k:'ata', side:'in', it:'Capitolo ATA', en:'ATA Chapter', ...V(379,ROW.part,537,ROW.ser), size:'h'},
 {k:'serial', side:'in', it:'Seriale / Lotto', en:'Serial- / Batchnumber', ...V(64,ROW.ser,379,ROW.plate), size:'h', nosug:true},
 {k:'cond', side:'in', it:'Condizione', en:'Condition', ...V(379,ROW.ser,537,ROW.plate), size:'h'},
 {k:'plate', side:'in', it:'Plate Mod Status', en:'Plate Mod Status', ...V(64,ROW.plate,537,ROW.manuf), size:'f'},
 {k:'manuf', side:'in', it:'Data di produzione', en:'Manuf.Date', ...V(64,ROW.manuf,221,ROW.owner), size:'t', date:true, nosug:true},
 {k:'tsn', side:'in', it:'TSN', en:'TSN', ...V(221,ROW.manuf,379,ROW.owner), size:'t'},
 {k:'csn', side:'in', it:'CSN', en:'CSN', ...V(379,ROW.manuf,537,ROW.owner), size:'t'},
 {k:'owner', side:'in', it:'Proprietario', en:'Owner', ...V(64,ROW.owner,379,ROW.rem), size:'h', carry:true},
 {k:'shelf', side:'in', it:'Scadenza shelf life', en:'Shelf Life Expiry', ...V(379,ROW.owner,537,ROW.rem), size:'h', date:true, nosug:true},
 {k:'remarks', side:'in', it:'Note', en:'Remarks', ...V(64,ROW.rem,537,ROW.cco,{top:10}), size:'f', multi:true, nosug:true},
 {k:'ccompany', side:'in', it:'Azienda certificante', en:'Certifying Company', ...V(64,ROW.cco,537,ROW.cnum), size:'f'},
 {k:'cnumber', side:'in', it:'N. certificazione', en:'Certifying Number', ...V(64,ROW.cnum,379,ROW.sup), size:'h', nosug:true},
 {k:'cdate', side:'in', it:'Data certificazione', en:'Certifying Date', ...V(379,ROW.cnum,537,ROW.sup), size:'h', date:true, nosug:true},
 {k:'supplier', side:'in', it:'Fornitore', en:'Supplier', ...V(64,ROW.sup,537,ROW.ord), size:'f'},
 {k:'order', side:'in', it:'N. ordine', en:'Ordernumber', ...V(64,ROW.ord,222,ROW.rec,{top:16}), size:'h', nosug:true},
 {k:'recloc', side:'in', it:'Ricevuto a stazione / magazzino', en:'Received at Station / Store / Location', ...V(222,ROW.ord,537,ROW.rec,{top:13}), size:'h', carry:true},
 {k:'recdate', side:'in', it:'Data ricezione', en:'Receiving Date', ...V(222,ROW.rec,379,694,{top:20}), size:'h', date:true, nosug:true},
 {k:'recby', side:'in', it:'Ricevuto da', en:'Received by', ...V(222,694,379,ROW.end,{top:22}), size:'h', carry:true},

 {k:'rdesc', side:'out', it:'Descrizione', en:'Description', ...V(627,ROW.desc,1100,ROW.part), size:'f'},
 {k:'rpart', side:'out', it:'Part number', en:'Partnumber', ...V(627,ROW.part,1100,ROW.ser), size:'h'},
 {k:'rserial', side:'out', it:'Seriale / Lotto', en:'Serial- / Batchnumber', ...V(627,ROW.ser,1100,ROW.plate), size:'h', nosug:true},
 {k:'aircraft', side:'out', it:'Aeromobile', en:'Aircraft', ...V(627,ROW.manuf,942,ROW.owner), size:'h', carry:true},
 {k:'operator', side:'out', it:'Operatore', en:'Operator', ...V(942,ROW.manuf,1100,ROW.owner), size:'h', carry:true},
 {k:'position', side:'out', it:'Posizione', en:'Position', ...V(627,ROW.owner,1100,ROW.rem), size:'h'},
 {k:'hours', side:'out', it:'Ore totali A/C', en:'Total A/C Hours', ...V(627,ROW.rem,784,431), size:'t', nosug:true},
 {k:'cycles', side:'out', it:'Cicli totali A/C', en:'Total A/C Cycles', ...V(784,ROW.rem,942,431), size:'t', nosug:true},
 {k:'sc1', side:'out', it:'Contatore spec. 1', en:'Spec. Counter 1', ...V(942,ROW.rem,1100,431), size:'t', nosug:true},
 {k:'wo', side:'out', it:'N. work order', en:'Workorder Number', ...V(627,431,942,ROW.cco), size:'h', nosug:true},
 {k:'sc2', side:'out', it:'Contatore spec. 2', en:'Spec. Counter 2', ...V(942,431,1100,ROW.cco), size:'h', nosug:true},
 {k:'reason', side:'out', it:'Motivo della rimozione', en:'Reason for Removal', type:'reason', size:'f',
   boxes:{Scheduled:[637,490,651,505], Unscheduled:[795,490,809,505], 'T/S':[953,490,967,505]}},
 {k:'rtext', side:'out', it:'Testo di rimozione', en:'Removal Text', ...V(627,ROW.cnum,1100,ROW.rec,{top:10}), size:'f', multi:true, nosug:true},
 {k:'rdate', side:'out', it:'Data', en:'Date', ...V(627,ROW.rec,784,674), size:'t', date:true, nosug:true},
 {k:'station', side:'out', it:'Stazione', en:'Station', ...V(784,ROW.rec,942,674), size:'t', carry:true},
 {k:'name', side:'out', it:'Nome', en:'Name', ...V(627,674,942,714), size:'h', carry:true},
];
