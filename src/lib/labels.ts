/**
 * Centralized bilingual labels and semantic tones for enumerations. Safe for client components.
 */
import type { Locale } from "@/lib/i18n";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";
export type LabelDef = { label: string; tone: Tone };
export type LabelSource = { fr: string; ar: string; tone: Tone };
export type LabelMap = Record<string, LabelSource>;

const def = (fr: string, ar: string, tone: Tone = "neutral"): LabelSource => ({ fr, ar, tone });

export const USER_STATUS: LabelMap = {
  PENDING: def("En attente", "قيد الانتظار", "info"),
  ACTIVE: def("Actif", "نشط", "success"),
  LOCKED: def("Verrouillé", "مقفل", "warning"),
  SUSPENDED: def("Suspendu", "معلَّق", "danger"),
  DISABLED: def("Désactivé", "معطَّل", "neutral"),
};

export const SCOPE_LEVEL: LabelMap = {
  NATIONAL: def("National", "وطني", "violet"),
  REGIONAL: def("Provincial", "إقليمي", "info"),
  DEPARTMENTAL: def("Départemental", "محافظاتي", "info"),
  STATION: def("Commissariat", "مركز الشرطة", "neutral"),
  OWN: def("Dossiers propres", "ملفاته الخاصة", "neutral"),
};

export const STATION_STATUS: LabelMap = {
  ACTIVE: def("En activité", "نشط", "success"),
  INACTIVE: def("Inactif", "غير نشط", "neutral"),
  UNDER_CONSTRUCTION: def("En construction", "قيد الإنشاء", "warning"),
  PLANNED: def("Planifié", "مخطَّط", "info"),
};

export const COMMUNE_TYPE: LabelMap = {
  COMMUNE: def("Commune", "بلدية"),
  SOUS_PREFECTURE: def("Sous-préfecture", "مقاطعة فرعية"),
  ARRONDISSEMENT: def("Arrondissement", "دائرة"),
};

export const LOCALITY_TYPE: LabelMap = {
  QUARTIER: def("Quartier", "حي"),
  VILLAGE: def("Village", "قرية"),
  CANTON: def("Canton", "كانتون"),
  LOCALITE: def("Localité", "محلة"),
};

export const AUDIT_OUTCOME: LabelMap = {
  SUCCESS: def("Succès", "نجاح", "success"),
  DENIED: def("Refusé", "مرفوض", "danger"),
  FAILURE: def("Échec", "فشل", "warning"),
};

export const NOTIFICATION_KIND: LabelMap = {
  INFO: def("Info", "معلومة", "info"),
  ASSIGNMENT: def("Affectation", "إسناد", "violet"),
  DEADLINE: def("Échéance", "موعد نهائي", "warning"),
  APPROVAL: def("Approbation", "موافقة", "info"),
  ALERT: def("Alerte", "تنبيه", "danger"),
  SECURITY: def("Sécurité", "أمان", "danger"),
};

export const PRIORITY: LabelMap = {
  LOW: def("Basse", "منخفضة", "neutral"),
  NORMAL: def("Normale", "عادية", "info"),
  HIGH: def("Haute", "عالية", "warning"),
  URGENT: def("Urgente", "عاجلة", "danger"),
};

export const SEVERITY: LabelMap = {
  LOW: def("Faible", "منخفضة", "neutral"),
  MEDIUM: def("Moyenne", "متوسطة", "info"),
  HIGH: def("Élevée", "عالية", "warning"),
  CRITICAL: def("Critique", "حرجة", "danger"),
};

export const STATION_TYPE: LabelMap = {
  HEADQUARTERS: def("Direction générale", "الإدارة العامة", "violet"),
  DELEGATION: def("Délégation de police", "مندوبية الشرطة", "violet"),
  PROVINCIAL_DIRECTION: def("Direction provinciale", "المديرية الإقليمية", "violet"),
  DEPARTMENTAL_DIRECTION: def("Direction départementale", "المديرية المحافظاتية", "info"),
  CENTRAL_STATION: def("Commissariat central", "المركز المركزي", "info"),
  STATION: def("Commissariat", "مركز الشرطة", "neutral"),
  POST: def("Poste de police", "مخفر الشرطة", "neutral"),
  UNIT: def("Unité", "وحدة", "neutral"),
  BRIGADE: def("Brigade", "لواء", "neutral"),
  SPECIAL_UNIT: def("Unité spéciale", "وحدة خاصة", "warning"),
};

export const ADMINISTRATIVE_STATUS: LabelMap = {
  ACTIVE: def("En activité", "في الخدمة", "success"),
  SECONDED: def("Détaché", "ملحق", "info"),
  AT_DISPOSAL: def("Mis à disposition", "موضوع تحت التصرف", "info"),
  SUSPENDED: def("Suspendu", "موقوف", "warning"),
  RETIRED: def("Retraité", "متقاعد", "neutral"),
  CEASED: def("Cessation de service", "انتهاء الخدمة", "neutral"),
  DECEASED: def("Décédé", "متوفى", "neutral"),
};

export const CAREER_EVENT_TYPE: LabelMap = {
  RECRUITMENT: def("Recrutement", "توظيف", "info"),
  APPOINTMENT: def("Nomination", "تعيين", "info"),
  PROMOTION: def("Promotion de grade", "ترقية في الرتبة", "success"),
  ADVANCEMENT: def("Avancement", "ترقية في الدرجة", "success"),
  FUNCTION_CHANGE: def("Changement de fonction", "تغيير الوظيفة", "info"),
  TRANSFER: def("Mutation", "نقل", "violet"),
  SECONDMENT: def("Détachement", "إلحاق", "warning"),
  AT_DISPOSAL: def("Mise à disposition", "وضع تحت التصرف", "warning"),
  REINSTATEMENT: def("Réintégration", "إعادة إدماج", "success"),
  RETIREMENT: def("Départ à la retraite", "إحالة على التقاعد", "neutral"),
  CESSATION: def("Cessation de service", "إنهاء الخدمة", "danger"),
  SUSPENSION: def("Suspension", "إيقاف عن العمل", "warning"),
};

export const TRANSFER_STATUS: LabelMap = {
  PROPOSED: def("Proposée", "مقترح", "info"),
  HR_APPROVED: def("Examinée par les RH", "درسته الموارد البشرية", "warning"),
  APPROVED: def("Validée", "مصادق عليه", "success"),
  EXECUTED: def("Exécutée", "منفَّذ", "success"),
  REJECTED: def("Rejetée", "مرفوض", "danger"),
  CANCELLED: def("Annulée", "ملغى", "neutral"),
};

export const TRANSFER_ORIGIN: LabelMap = {
  MANUAL: def("Proposition manuelle", "اقتراح يدوي", "neutral"),
  AUTOMATIC: def("Détection automatique", "رصد تلقائي", "info"),
};

export const ATTENDANCE_STATUS: LabelMap = {
  PRESENT: def("Présent", "حاضر", "success"),
  LATE: def("En retard", "متأخر", "warning"),
  ABSENT: def("Absent", "غائب", "danger"),
  ON_LEAVE: def("En congé", "في عطلة", "info"),
  PERMISSION: def("En permission", "في رخصة", "info"),
  UNAVAILABLE: def("Indisponible", "غير متاح", "neutral"),
};

export const LEAVE_TYPE: LabelMap = {
  ANNUAL: def("Congé annuel", "عطلة سنوية", "info"),
  EXCEPTIONAL: def("Congé exceptionnel", "عطلة استثنائية", "violet"),
  PERMISSION: def("Permission", "رخصة", "neutral"),
  ABSENCE_AUTHORIZATION: def("Autorisation d'absence", "ترخيص بالغياب", "neutral"),
  UNAVAILABILITY: def("Indisponibilité", "عدم الجاهزية", "warning"),
};

export const LEAVE_STATUS: LabelMap = {
  REQUESTED: def("Demandée", "مطلوبة", "warning"),
  APPROVED: def("Approuvée", "موافق عليها", "success"),
  REJECTED: def("Rejetée", "مرفوضة", "danger"),
  CANCELLED: def("Annulée", "ملغاة", "neutral"),
};

export const TRAINING_KIND: LabelMap = {
  INITIAL: def("Formation initiale", "تكوين أساسي", "info"),
  CONTINUING: def("Formation continue", "تكوين مستمر", "neutral"),
  INTERNSHIP: def("Stage professionnel", "تربص مهني", "violet"),
  SPECIALIZED: def("Formation spécialisée", "تكوين متخصص", "warning"),
};

export const DISCIPLINE_STATUS: LabelMap = {
  OPEN: def("Ouvert", "مفتوح", "warning"),
  IN_PROCEDURE: def("En procédure", "قيد الإجراء", "info"),
  DECIDED: def("Décidé", "تم البت", "violet"),
  CLOSED: def("Clos", "مغلق", "neutral"),
};

export const DISCIPLINE_STEP: LabelMap = {
  NOTIFICATION: def("Notification des griefs", "إبلاغ بالمآخذ", "info"),
  HEARING: def("Audition / droits de la défense", "استماع / حقوق الدفاع", "success"),
  REPORT: def("Rapport", "تقرير", "neutral"),
  NOTE: def("Note", "ملاحظة", "neutral"),
};

export const SANCTION_KIND: LabelMap = {
  NO_ACTION: def("Classement sans suite", "حفظ دون عقوبة", "neutral"),
  WARNING: def("Avertissement", "إنذار", "warning"),
  REPRIMAND: def("Blâme", "توبيخ", "warning"),
  SUSPENSION: def("Mise à pied (suspension)", "إيقاف عن العمل", "danger"),
  DISMISSAL: def("Révocation", "عزل", "danger"),
};

export const DISTINCTION_KIND: LabelMap = {
  COMMENDATION: def("Félicitations", "تنويه", "success"),
  CITATION: def("Citation", "إشادة", "success"),
  MEDAL: def("Médaille", "وسام", "violet"),
  REWARD: def("Récompense", "مكافأة", "info"),
};

export const HR_DOCUMENT_KIND: LabelMap = {
  ASSIGNMENT_DECISION: def("Décision d'affectation", "مقرر تعيين", "info"),
  APPOINTMENT_ORDER: def("Arrêté de nomination", "قرار تعيين", "info"),
  TRANSFER_DECISION: def("Décision de mutation", "مقرر نقل", "violet"),
  WORK_CERTIFICATE: def("Attestation de travail", "شهادة عمل", "success"),
  TRAINING_DOCUMENT: def("Document de formation", "وثيقة تكوين", "neutral"),
  ADMIN_FILE: def("Dossier administratif", "ملف إداري", "neutral"),
  DISCIPLINARY_DOCUMENT: def("Document disciplinaire", "وثيقة تأديبية", "danger"),
  SERVICE_NOTE: def("Note de service", "مذكرة خدمة", "warning"),
};

export const PAY_KIND: LabelMap = {
  BONUS: def("Prime", "علاوة", "success"),
  ALLOWANCE: def("Indemnité", "تعويض", "info"),
  BENEFIT: def("Avantage en nature", "منفعة عينية", "violet"),
  DEDUCTION: def("Retenue", "اقتطاع", "danger"),
};

export const PAY_CALCULATION: LabelMap = {
  FIXED: def("Montant fixe (FCFA)", "مبلغ ثابت (فرنك)", "neutral"),
  PERCENT_OF_BASE: def("% de la solde de base", "٪ من الأجر الأساسي", "neutral"),
};

export const PAY_APPROVAL: LabelMap = {
  PENDING: def("En attente de validation", "في انتظار المصادقة", "warning"),
  ACTIVE: def("Validé", "مصادق عليه", "success"),
  REJECTED: def("Rejeté", "مرفوض", "danger"),
};

export const PAY_RUN_STATUS: LabelMap = {
  DRAFT: def("Brouillon", "مسودة", "warning"),
  VALIDATED: def("Validé", "مصادق عليه", "success"),
};

export const DEPARTMENT_TYPE: LabelMap = {
  COMMAND: def("Commandement", "القيادة", "violet"),
  INVESTIGATION: def("Enquêtes", "التحقيقات", "info"),
  PATROL: def("Patrouille", "الدوريات", "neutral"),
  TRAFFIC: def("Circulation", "المرور", "neutral"),
  FORENSICS: def("Police scientifique", "الأدلة الجنائية", "info"),
  INTELLIGENCE: def("Renseignement", "الاستخبارات", "warning"),
  CUSTODY: def("Garde à vue", "الحجز الاحتياطي", "neutral"),
  LOGISTICS: def("Logistique", "اللوجستيات", "neutral"),
  ADMINISTRATION: def("Administration", "الإدارة", "neutral"),
  SPECIAL: def("Unité spéciale", "وحدة خاصة", "warning"),
};

export const RANK_CATEGORY: LabelMap = {
  COMMISSIONER: def("Commissaires", "المفوضون", "violet"),
  OFFICER: def("Officiers", "الضباط", "info"),
  INSPECTOR: def("Inspecteurs", "المفتشون", "info"),
  NON_COMMISSIONED: def("Sous-officiers", "ضباط الصف", "neutral"),
  CONSTABLE: def("Gardiens de la paix", "أعوان الأمن", "neutral"),
  CIVILIAN: def("Personnel civil", "موظفون مدنيون", "neutral"),
};

export const GENDER: LabelMap = {
  MALE: def("Masculin", "ذكر"),
  FEMALE: def("Féminin", "أنثى"),
  OTHER: def("Autre", "آخر"),
  UNKNOWN: def("Non renseigné", "غير محدد"),
};

export const DUTY_STATUS: LabelMap = {
  ON_DUTY: def("En service", "في الخدمة", "success"),
  OFF_DUTY: def("Repos", "راحة", "neutral"),
  ON_LEAVE: def("En congé", "في إجازة", "info"),
  TRAINING: def("En formation", "في تدريب", "info"),
  SUSPENDED: def("Suspendu", "موقوف", "danger"),
  RETIRED: def("Retraité", "متقاعد", "neutral"),
  DECEASED: def("Décédé", "متوفى", "neutral"),
};

export const TRAINING_STATUS: LabelMap = {
  PLANNED: def("Planifiée", "مخطَّط", "info"),
  IN_PROGRESS: def("En cours", "جارٍ", "warning"),
  COMPLETED: def("Terminée", "مكتمل", "success"),
  FAILED: def("Échouée", "فاشل", "danger"),
  CANCELLED: def("Annulée", "ملغى", "neutral"),
};

export const MARITAL_STATUS: LabelMap = {
  SINGLE: def("Célibataire", "أعزب/عزباء"),
  MARRIED: def("Marié(e)", "متزوج(ة)"),
  DIVORCED: def("Divorcé(e)", "مطلَّق(ة)"),
  WIDOWED: def("Veuf/veuve", "أرمل(ة)"),
  UNKNOWN: def("Non renseigné", "غير محدد"),
};

export const IDENTIFIER_TYPE: LabelMap = {
  NATIONAL_ID: def("Carte nationale d'identité", "بطاقة الهوية الوطنية"),
  PASSPORT: def("Passeport", "جواز السفر"),
  DRIVER_LICENSE: def("Permis de conduire", "رخصة القيادة"),
  VOTER_CARD: def("Carte d'électeur", "بطاقة الناخب"),
  RESIDENCE_PERMIT: def("Carte de séjour", "بطاقة الإقامة"),
  BIRTH_CERTIFICATE: def("Acte de naissance", "شهادة الميلاد"),
  OTHER: def("Autre", "أخرى"),
};

export const RELATIONSHIP_TYPE: LabelMap = {
  SPOUSE: def("Conjoint(e)", "الزوج/الزوجة"),
  PARENT: def("Parent", "أحد الوالدين"),
  CHILD: def("Enfant", "ابن/ابنة"),
  SIBLING: def("Frère / sœur", "أخ/أخت"),
  RELATIVE: def("Membre de la famille", "قريب"),
  ASSOCIATE: def("Associé(e)", "شريك"),
  EMPLOYER: def("Employeur", "صاحب العمل"),
  EMPLOYEE: def("Employé(e)", "موظف(ة)"),
  NEIGHBOUR: def("Voisin(e)", "جار(ة)"),
  OTHER: def("Autre", "أخرى"),
};

export const OFFENSE_CATEGORY: LabelMap = {
  HOMICIDE: def("Homicide", "جريمة قتل", "danger"),
  ASSAULT: def("Coups et blessures", "ضرب وجرح", "danger"),
  SEXUAL_OFFENSE: def("Infraction sexuelle", "جريمة جنسية", "danger"),
  ROBBERY: def("Vol avec violence", "سرقة بالإكراه", "danger"),
  THEFT: def("Vol", "سرقة", "warning"),
  BURGLARY: def("Cambriolage", "سطو", "warning"),
  FRAUD: def("Escroquerie / fraude", "احتيال / نصب", "warning"),
  CORRUPTION: def("Corruption", "فساد", "warning"),
  DRUG_OFFENSE: def("Stupéfiants", "مخدرات", "warning"),
  TRAFFICKING: def("Trafic (êtres humains, biens)", "اتجار (بشر، بضائع)", "danger"),
  CYBERCRIME: def("Cybercriminalité", "جريمة إلكترونية", "info"),
  ARMS_OFFENSE: def("Armes", "أسلحة", "danger"),
  KIDNAPPING: def("Enlèvement", "اختطاف", "danger"),
  DOMESTIC_VIOLENCE: def("Violence domestique", "عنف أسري", "danger"),
  TRAFFIC_OFFENSE: def("Infraction routière", "مخالفة مرورية", "neutral"),
  PUBLIC_ORDER: def("Trouble à l'ordre public", "إخلال بالنظام العام", "neutral"),
  PROPERTY_DAMAGE: def("Dégradation de biens", "إتلاف ممتلكات", "neutral"),
  MISSING_PERSON: def("Disparition", "شخص مفقود", "info"),
  TERRORISM: def("Terrorisme", "إرهاب", "danger"),
  OTHER: def("Autre", "أخرى", "neutral"),
};

export const COMPLAINT_STATUS: LabelMap = {
  DRAFT: def("Brouillon", "مسودة", "neutral"),
  REGISTERED: def("Enregistrée", "مسجَّلة", "info"),
  UNDER_REVIEW: def("En examen", "قيد الفحص", "warning"),
  ASSIGNED: def("Affectée", "مُسنَدة", "violet"),
  CONVERTED: def("Convertie en affaire", "حُوِّلت إلى قضية", "success"),
  CLOSED: def("Clôturée", "مغلقة", "neutral"),
  REJECTED: def("Rejetée", "مرفوضة", "danger"),
};

export const CASE_STATUS: LabelMap = {
  OPEN: def("Ouverte", "مفتوحة", "info"),
  ASSIGNED: def("Affectée", "مُسنَدة", "violet"),
  UNDER_INVESTIGATION: def("En enquête", "قيد التحقيق", "warning"),
  PENDING_REVIEW: def("En attente de revue", "بانتظار المراجعة", "warning"),
  REFERRED: def("Transmise", "مُحالة", "info"),
  CLOSED: def("Clôturée", "مغلقة", "success"),
  ARCHIVED: def("Archivée", "مؤرشفة", "neutral"),
};

export const CASE_DISPOSITION: LabelMap = {
  SOLVED: def("Élucidée", "محلولة", "success"),
  UNSOLVED: def("Non élucidée", "غير محلولة", "neutral"),
  UNFOUNDED: def("Sans fondement", "بلا أساس", "neutral"),
  REFERRED_TO_PROSECUTION: def("Transmise au parquet", "أُحيلت إلى النيابة", "info"),
  TRANSFERRED: def("Transférée", "مُحوَّلة", "info"),
  DISMISSED: def("Classée sans suite", "حُفظت بلا متابعة", "neutral"),
};

export const PARTY_ROLE: LabelMap = {
  COMPLAINANT: def("Plaignant(e)", "الشاكي/الشاكية", "info"),
  VICTIM: def("Victime", "الضحية", "danger"),
  WITNESS: def("Témoin", "الشاهد", "neutral"),
  SUSPECT: def("Suspect(e)", "المشتبه به/بها", "warning"),
  PERSON_OF_INTEREST: def("Personne d'intérêt", "شخص محل اهتمام", "warning"),
  ACCUSED: def("Mis(e) en cause", "المتهم(ة)", "danger"),
  OTHER: def("Autre", "أخرى", "neutral"),
};

export const PARTY_STATUS: LabelMap = {
  ACTIVE: def("Active", "نشطة", "info"),
  UNDER_INVESTIGATION: def("Sous enquête", "قيد التحقيق", "warning"),
  CLEARED: def("Mis(e) hors de cause", "بريء/بريئة", "success"),
  CHARGED: def("Poursuivi(e)", "متابَع(ة) قضائيًا", "danger"),
  REFERRED: def("Transmis(e)", "مُحال(ة)", "info"),
  WITHDRAWN: def("Retiré(e)", "مسحوب(ة)", "neutral"),
};

export const CASE_ROLE: LabelMap = {
  LEAD: def("Enquêteur principal", "المحقق الرئيسي", "violet"),
  INVESTIGATOR: def("Enquêteur", "محقق", "info"),
  SUPERVISOR: def("Superviseur", "مشرف", "warning"),
  ANALYST: def("Analyste", "محلل", "neutral"),
  SUPPORT: def("Appui", "دعم", "neutral"),
};

export const TASK_STATUS: LabelMap = {
  TODO: def("À faire", "للقيام به", "neutral"),
  IN_PROGRESS: def("En cours", "جارٍ", "warning"),
  BLOCKED: def("Bloquée", "معطَّلة", "danger"),
  DONE: def("Terminée", "مكتملة", "success"),
  CANCELLED: def("Annulée", "ملغاة", "neutral"),
};

export const INCIDENT_TYPE: LabelMap = {
  DISTURBANCE: def("Trouble / rixe", "شغب / عراك", "warning"),
  TRAFFIC_ACCIDENT: def("Accident de la circulation", "حادث مرور", "warning"),
  ASSAULT: def("Agression", "اعتداء", "danger"),
  THEFT: def("Vol", "سرقة", "warning"),
  FIRE: def("Incendie", "حريق", "danger"),
  MEDICAL: def("Urgence médicale", "حالة طبية طارئة", "info"),
  SUSPICIOUS_ACTIVITY: def("Activité suspecte", "نشاط مشبوه", "info"),
  PUBLIC_ORDER: def("Ordre public", "النظام العام", "warning"),
  DOMESTIC: def("Violence domestique", "حادث أسري", "danger"),
  NOISE: def("Nuisance sonore", "إزعاج صوتي", "neutral"),
  MISSING_PERSON: def("Personne disparue", "شخص مفقود", "violet"),
  OTHER: def("Autre", "أخرى", "neutral"),
};

export const INCIDENT_STATUS: LabelMap = {
  REPORTED: def("Signalé", "مُبلَّغ عنه", "info"),
  RESPONDING: def("Intervention en route", "التدخل في الطريق", "warning"),
  ON_SCENE: def("Sur les lieux", "في الموقع", "violet"),
  RESOLVED: def("Résolu", "محلول", "success"),
  ESCALATED: def("Transmis en affaire", "حُوِّل إلى قضية", "danger"),
  CLOSED: def("Clos", "مغلق", "neutral"),
};

export const PATROL_STATUS: LabelMap = {
  PLANNED: def("Planifiée", "مخطَّطة", "info"),
  ACTIVE: def("En cours", "جارية", "success"),
  COMPLETED: def("Terminée", "منتهية", "neutral"),
  CANCELLED: def("Annulée", "ملغاة", "danger"),
};

export const SHIFT: LabelMap = {
  MORNING: def("Matin (06h–14h)", "صباحًا (06:00–14:00)", "info"),
  AFTERNOON: def("Après-midi (14h–22h)", "بعد الظهر (14:00–22:00)", "warning"),
  NIGHT: def("Nuit (22h–06h)", "ليلاً (22:00–06:00)", "violet"),
  CUSTOM: def("Horaire spécifique", "توقيت مخصص", "neutral"),
};

export const VEHICLE_STATUS: LabelMap = {
  AVAILABLE: def("Disponible", "متاحة", "success"),
  IN_USE: def("En service", "قيد الاستخدام", "info"),
  MAINTENANCE: def("En maintenance", "في الصيانة", "warning"),
  OUT_OF_SERVICE: def("Hors service", "خارج الخدمة", "danger"),
  DECOMMISSIONED: def("Réformé", "مسحوبة من الخدمة", "neutral"),
};

export const VEHICLE_TYPE: LabelMap = {
  PATROL_CAR: def("Véhicule de patrouille", "سيارة دورية", "info"),
  MOTORCYCLE: def("Moto", "دراجة نارية", "info"),
  VAN: def("Fourgon", "شاحنة صغيرة", "neutral"),
  PICKUP: def("Pick-up", "بيك أب", "neutral"),
  TRUCK: def("Camion", "شاحنة", "neutral"),
  BUS: def("Bus", "حافلة", "neutral"),
  UNMARKED: def("Banalisé", "غير مميَّزة", "violet"),
  OTHER: def("Autre", "أخرى", "neutral"),
};

export const EVIDENCE_CATEGORY: LabelMap = {
  PHYSICAL: def("Physique", "مادي", "neutral"),
  DOCUMENT: def("Document", "مستند", "neutral"),
  DIGITAL: def("Numérique", "رقمي", "info"),
  BIOLOGICAL: def("Biologique", "بيولوجي", "violet"),
  WEAPON: def("Arme", "سلاح", "danger"),
  NARCOTICS: def("Stupéfiants", "مخدرات", "danger"),
  VEHICLE: def("Véhicule", "مركبة", "neutral"),
  CURRENCY: def("Numéraire", "نقود", "neutral"),
  AUDIO_VIDEO: def("Audio/Vidéo", "صوت/فيديو", "info"),
  OTHER: def("Autre", "أخرى", "neutral"),
};

export const EVIDENCE_STATUS: LabelMap = {
  COLLECTED: def("Collectée", "مُجمَّعة", "info"),
  REGISTERED: def("Enregistrée", "مسجَّلة", "info"),
  STORED: def("Stockée", "مخزَّنة", "success"),
  TRANSFERRED: def("Transférée", "منقولة", "warning"),
  UNDER_EXAMINATION: def("En examen", "قيد الفحص", "violet"),
  RETURNED: def("Restituée", "مُعادة", "neutral"),
  RELEASED: def("Libérée", "مُفرج عنها", "neutral"),
  DESTROYED: def("Détruite", "مُتلَفة", "danger"),
  ARCHIVED: def("Archivée", "مؤرشفة", "neutral"),
};

export const CUSTODY_ACTION: LabelMap = {
  COLLECTED: def("Collecte", "جمع", "info"),
  REGISTERED: def("Enregistrement", "تسجيل", "info"),
  STORED: def("Stockage", "تخزين", "success"),
  TRANSFERRED: def("Transfert", "نقل", "warning"),
  CHECKED_OUT: def("Sortie", "إخراج", "warning"),
  CHECKED_IN: def("Entrée", "إدخال", "success"),
  EXAMINED: def("Examen", "فحص", "violet"),
  RETURNED: def("Restitution", "إعادة", "neutral"),
  RELEASED: def("Libération", "إفراج", "neutral"),
  DESTROYED: def("Destruction", "إتلاف", "danger"),
  ARCHIVED: def("Archivage", "أرشفة", "neutral"),
};

export const STORAGE_LOCATION_TYPE: LabelMap = {
  EVIDENCE_ROOM: def("Salle des pièces", "غرفة الأدلة", "neutral"),
  SAFE: def("Coffre-fort", "خزنة", "violet"),
  REFRIGERATED: def("Chambre froide", "غرفة تبريد", "info"),
  VEHICLE_LOT: def("Fourrière", "مستودع المركبات", "neutral"),
  LABORATORY: def("Laboratoire", "مختبر", "info"),
  ARMORY: def("Armurerie", "مستودع الأسلحة", "danger"),
  EXTERNAL: def("Externe", "خارجي", "neutral"),
};

export const BIOMETRIC_TYPE: LabelMap = {
  FINGERPRINT: def("Empreinte digitale", "بصمة الإصبع", "info"),
  FACE: def("Reconnaissance faciale", "التعرّف على الوجه", "violet"),
  VOICE: def("Reconnaissance vocale", "التعرّف الصوتي", "info"),
  ANPR: def("Plaque d'immatriculation (LAPI)", "لوحة التسجيل (LAPI)", "neutral"),
};

export const BIOMETRIC_SEARCH_MODE: LabelMap = {
  VERIFY_1_1: def("Vérification 1:1", "تحقق 1:1", "neutral"),
  IDENTIFY_1_N: def("Identification 1:N", "تعرّف 1:N", "neutral"),
};

export const BIOMETRIC_SEARCH_RESULT: LabelMap = {
  NO_MATCH: def("Aucune correspondance", "لا يوجد تطابق", "neutral"),
  POTENTIAL_MATCH: def("Correspondance potentielle", "تطابق محتمل", "warning"),
  VERIFIED_MATCH: def("Correspondance vérifiée", "تطابق مؤكَّد", "success"),
  ERROR: def("Erreur", "خطأ", "danger"),
};

export const BIOMETRIC_ACTION: LabelMap = {
  NONE: def("Aucune action", "لا إجراء", "neutral"),
  SENT_FOR_VERIFICATION: def("Transmis pour vérification", "أُرسل للتحقق", "info"),
  VERIFIED_BY_INVESTIGATOR: def("Vérifié par l'enquêteur", "تحقَّق منه المحقق", "success"),
  REJECTED: def("Rejeté", "مرفوض", "danger"),
  LINKED_TO_CASE: def("Rattaché à l'affaire", "مرتبط بالقضية", "violet"),
};

export const FINGER_POSITION: LabelMap = {
  RIGHT_THUMB: def("Pouce droit", "الإبهام الأيمن"),
  RIGHT_INDEX: def("Index droit", "السبابة اليمنى"),
  RIGHT_MIDDLE: def("Majeur droit", "الوسطى اليمنى"),
  RIGHT_RING: def("Annulaire droit", "البنصر الأيمن"),
  RIGHT_LITTLE: def("Auriculaire droit", "الخنصر الأيمن"),
  LEFT_THUMB: def("Pouce gauche", "الإبهام الأيسر"),
  LEFT_INDEX: def("Index gauche", "السبابة اليسرى"),
  LEFT_MIDDLE: def("Majeur gauche", "الوسطى اليسرى"),
  LEFT_RING: def("Annulaire gauche", "البنصر الأيسر"),
  LEFT_LITTLE: def("Auriculaire gauche", "الخنصر الأيسر"),
  UNKNOWN: def("Non précisé", "غير محدد"),
};

export const LPR_STATUS: LabelMap = {
  NEW: def("Nouvelle", "جديدة", "info"),
  REVIEWED: def("Examinée", "مفحوصة", "warning"),
  LINKED_TO_CASE: def("Rattachée à l'affaire", "مرتبطة بالقضية", "violet"),
  DISMISSED: def("Classée sans suite", "حُفظت بلا متابعة", "neutral"),
};

export const WANTED_STATUS: LabelMap = {
  DRAFT: def("Brouillon", "مسودة", "neutral"),
  PENDING_APPROVAL: def("En attente d'approbation", "بانتظار الموافقة", "info"),
  ACTIVE: def("Actif", "نشط", "danger"),
  LOCATED: def("Localisé", "تم تحديد موقعه", "warning"),
  ARRESTED: def("Appréhendé", "تم القبض عليه", "success"),
  CANCELLED: def("Annulé", "ملغى", "neutral"),
  EXPIRED: def("Expiré", "منتهي الصلاحية", "neutral"),
};

export const DANGER_LEVEL: LabelMap = {
  LOW: def("Standard", "عادية", "neutral"),
  MEDIUM: def("Prioritaire", "ذات أولوية", "info"),
  HIGH: def("Haute priorité", "أولوية عالية", "warning"),
  EXTREME: def("Critique", "حرجة", "danger"),
};

/* ---- Circulation routière : infractions, PV, amendes, paiements ---- */

export const TRAFFIC_OFFENCE_CLASS: LabelMap = {
  CLASS_2: def("2ème classe", "الدرجة الثانية", "info"),
  CLASS_3: def("3ème classe", "الدرجة الثالثة", "warning"),
  CLASS_4: def("4ème classe", "الدرجة الرابعة", "danger"),
  DELIT: def("Délit", "جنحة", "violet"),
};

export const TRAFFIC_CATEGORY: LabelMap = {
  ROAD: def("Infractions routières", "المخالفات الطرقية", "info"),
  CYCLE_MOTORCYCLE: def("Cycles et motocyclettes", "الدراجات والدراجات النارية", "violet"),
  MOTO_TAXI: def("Moto-taxis", "سيارات الأجرة الدراجة (موطو-تاكسي)", "warning"),
};

export const TRAFFIC_VEHICLE_TYPE: LabelMap = {
  CAR: def("Voiture particulière", "سيارة خاصة"),
  PICKUP: def("Pick-up / camionnette", "شاحنة صغيرة"),
  MOTORCYCLE: def("Motocyclette", "دراجة نارية"),
  MOTO_TAXI: def("Moto-taxi", "موطو-تاكسي"),
  TRICYCLE: def("Tricycle", "دراجة ثلاثية العجلات"),
  CYCLE: def("Cycle / cyclomoteur", "دراجة / دراجة بمحرك"),
  MINIBUS: def("Minibus", "حافلة صغيرة"),
  BUS: def("Autocar / bus", "حافلة"),
  TRUCK: def("Camion", "شاحنة"),
  TRACTOR_TRAILER: def("Tracteur avec remorque", "جرار مع مقطورة"),
  OTHER: def("Autre", "أخرى"),
};

export const TRAFFIC_VEHICLE_STATUS: LabelMap = {
  ACTIVE: def("En circulation", "قيد السير", "success"),
  SUSPENDED: def("Suspendu", "معلَّق", "warning"),
  SEIZED: def("Saisi", "محجوز", "danger"),
  STOLEN: def("Volé", "مسروق", "danger"),
  SCRAPPED: def("Retiré / hors d'usage", "مسحوب / خارج الخدمة", "neutral"),
};

export const TRAFFIC_VEHICLE_DOC_TYPE: LabelMap = {
  REGISTRATION_CARD: def("Carte grise", "البطاقة الرمادية"),
  INSURANCE: def("Assurance", "التأمين"),
  TECHNICAL_INSPECTION: def("Visite technique", "الفحص التقني"),
  BLUE_CARD: def("Carte bleue", "البطاقة الزرقاء"),
  TRANSPORT_LICENSE: def("Licence de transport", "رخصة النقل"),
  STICKER: def("Vignette", "الملصق الضريبي"),
  OTHER: def("Autre document", "وثيقة أخرى"),
};

export const TRAFFIC_CONTROL_OUTCOME: LabelMap = {
  COMPLIANT: def("Conforme", "مطابق", "success"),
  INFRACTION: def("Infraction relevée", "مخالفة مسجَّلة", "danger"),
};

export const TRAFFIC_TICKET_STATUS: LabelMap = {
  ISSUED: def("Établi", "محرَّر", "success"),
  CANCELLED: def("Annulé", "ملغى", "neutral"),
};

export const TRAFFIC_FINE_STATUS: LabelMap = {
  TO_PAY: def("À payer", "مستحقة الدفع", "warning"),
  PENDING: def("En attente", "قيد الانتظار", "info"),
  PARTIALLY_PAID: def("Partiellement payée", "مدفوعة جزئياً", "violet"),
  PAID: def("Payée", "مدفوعة", "success"),
  CONTESTED: def("Contestée", "مطعون فيها", "danger"),
  CANCELLED: def("Annulée", "ملغاة", "neutral"),
};

export const TRAFFIC_PAYMENT_METHOD: LabelMap = {
  CASH: def("Espèces", "نقداً"),
  ELECTRONIC: def("Paiement électronique", "دفع إلكتروني", "info"),
  MOBILE_MONEY: def("Mobile Money", "الدفع عبر الهاتف (موبايل موني)", "info"),
  BANK_TRANSFER: def("Virement bancaire", "تحويل بنكي", "info"),
  OTHER: def("Autre moyen autorisé", "وسيلة أخرى مرخَّصة"),
};

export const TRAFFIC_PAYMENT_STATUS: LabelMap = {
  COMPLETED: def("Enregistré", "مسجَّل", "success"),
  VOIDED: def("Annulé", "ملغى", "neutral"),
};

export const CASH_REGISTER_STATUS: LabelMap = {
  OPEN: def("Ouverte", "مفتوح", "success"),
  CLOSED: def("Clôturée", "مقفل", "neutral"),
  PENDING_DEPOSIT: def("En attente de versement", "في انتظار التسديد", "warning"),
  DEPOSITED: def("Versée", "مسدَّد", "info"),
  VALIDATED: def("Validée", "مصادَق عليه", "success"),
  BLOCKED: def("Bloquée", "محظور", "danger"),
};

export const CASH_COLLECTION_STATUS: LabelMap = {
  TO_DEPOSIT: def("À verser", "للتسديد", "warning"),
  PARTIALLY_DEPOSITED: def("Partiellement versée", "مسدَّد جزئياً", "violet"),
  DEPOSITED: def("Versée", "مسدَّد", "info"),
  VALIDATED: def("Validée", "مصادَق عليه", "success"),
};

export const CASH_DEPOSIT_METHOD: LabelMap = {
  BANK: def("Banque", "بنك"),
  TREASURY: def("Trésor / administration", "الخزينة / الإدارة"),
  CENTRAL_CASH: def("Caisse centrale", "الصندوق المركزي"),
  MOBILE_MONEY: def("Mobile Money (si autorisé)", "موبايل موني (إن كان مرخَّصاً)", "info"),
  OTHER: def("Autre moyen autorisé", "وسيلة أخرى مرخَّصة"),
};

export const CASH_DEPOSIT_STATUS: LabelMap = {
  SUBMITTED: def("Déclaré", "مصرَّح به", "info"),
  VERIFIED: def("Vérifié", "تم التحقق", "violet"),
  JUSTIFICATION_REQUESTED: def("Justification demandée", "مطلوب تبرير", "warning"),
  VALIDATED: def("Validé", "مصادَق عليه", "success"),
  REJECTED: def("Rejeté", "مرفوض", "danger"),
};

export const CASH_RECONCILIATION_STATUS: LabelMap = {
  PENDING: def("En attente", "قيد الانتظار", "info"),
  CONFORME: def("Conforme", "مطابق", "success"),
  GAP_TO_JUSTIFY: def("Écart à justifier", "فارق يجب تبريره", "warning"),
  VALIDATED: def("Validé", "مصادَق عليه", "success"),
  REJECTED: def("Rejeté", "مرفوض", "danger"),
};

export const CASH_DISCREPANCY_STATUS: LabelMap = {
  OPEN: def("Ouvert", "مفتوح", "danger"),
  JUSTIFIED: def("Justifié", "تم تبريره", "warning"),
  VALIDATED: def("Validé", "مصادَق عليه", "success"),
  REJECTED: def("Justification rejetée", "التبرير مرفوض", "danger"),
};

export const TRAFFIC_EVIDENCE_KIND: LabelMap = {
  PHOTO: def("Photo", "صورة"),
  VIDEO: def("Vidéo", "فيديو"),
  DOCUMENT: def("Document", "وثيقة"),
};

export function labelOf(map: LabelMap, key: string | null | undefined, locale: Locale): LabelDef {
  if (!key) return { label: "—", tone: "neutral" };
  const d = map[key];
  if (!d) return { label: humanize(key), tone: "neutral" };
  return { label: d[locale] ?? d.fr, tone: d.tone };
}

export function humanize(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function optionsOf(map: LabelMap, locale: Locale): { value: string; label: string }[] {
  return Object.entries(map).map(([value, d]) => ({ value, label: d[locale] ?? d.fr }));
}
