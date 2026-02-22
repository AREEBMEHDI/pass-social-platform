import { colors } from '../theme/colors';

export const socials = {
  bgOrbTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,92,255,0.14)',
    top: -110,
    left: -50,
  },
  bgOrbRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,255,181,0.1)',
    top: 140,
    right: -90,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,92,255,0.1)',
    bottom: -170,
    left: 10,
  },
  glowHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,92,255,0.08)',
    alignSelf: 'center',
    top: 40,
  },
  /* ----------------------------------------------------
   * Base
   * -------------------------------------------------- */
  placeholder: colors.muted || '#888',

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 64,
    borderRadius: 32,
    marginBottom: 14,

    // subtle depth
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    marginHorizontal: 12,
  },

  /* ----------------------------------------------------
   * Icons
   * -------------------------------------------------- */
  socialIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  emojiBtn: {
    fontSize: 18,
    color: '#aaa',
    paddingLeft: 6,
  },

  emojiAdd: {
    fontSize: 20,
    color: '#888',
    marginTop: -1,
  },

  emojiLock: {
    fontSize: 16,
    marginTop: 2,
  },

  /* ----------------------------------------------------
   * Social Brand Backgrounds
   * -------------------------------------------------- */
  instagram: {
    backgroundColor: '#4b2a4f',
  },

  facebook: {
    backgroundColor: '#1b2e59',
  },

  snapchat: {
    backgroundColor: '#3a3a1a',
  },

  discord: {
    backgroundColor: '#1f2d55',
  },

  linkedin: {
    backgroundColor: '#1e3a4a',
  },

  twitter: {
    backgroundColor: '#1c3b4f',
  },

  website: {
    backgroundColor: '#2a2a2a',
  },

  /* ----------------------------------------------------
   * Add More
   * -------------------------------------------------- */
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginVertical: 14,
  },

  addMoreText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 6,
  },

  /* ----------------------------------------------------
   * Privacy Section
   * -------------------------------------------------- */
  privacyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 22,
  },

  privacyTitle: {
    color: '#9dd',
    fontSize: 13,
    marginBottom: 2,
  },

  privacyText: {
    color: '#777',
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    color: '#ff8a8a',
    marginTop: 10,
  },
  overlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.55)',
},

sheet: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  paddingTop: 12,
  paddingBottom: 24,
  paddingHorizontal: 20,
  backgroundColor: '#111',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
},

sheetHandle: {
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: '#444',
  alignSelf: 'center',
  marginBottom: 12,
},

sheetTitle: {
  color: '#fff',
  fontSize: 18,
  textAlign: 'center',
  marginBottom: 20,
},

sheetGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: 14,
},

sheetItem: {
  width: '48%',
  height: 90,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},

sheetIcon: {
  width: 26,
  height: 26,
  resizeMode: 'contain',
  marginBottom: 6,
},

sheetText: {
  color: '#fff',
  fontSize: 13,
},

cancel: {
  color: '#777',
  fontSize: 14,
  textAlign: 'center',
  marginTop: 20,
},



};
