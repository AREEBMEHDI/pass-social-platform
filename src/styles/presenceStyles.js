import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const presence = StyleSheet.create({
  bgOrbTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,92,255,0.14)',
    top: -120,
    left: -60,
  },
  bgOrbRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,255,181,0.1)',
    top: 120,
    right: -90,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,92,255,0.1)',
    bottom: -160,
    left: 10,
  },
  glowHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124,92,255,0.08)',
    alignSelf: 'center',
    top: 40,
  },
  label: {
    color: colors.subtle,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },

  vibeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },

  vibe: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.glass,
  },

  vibeActive: {
    backgroundColor: colors.primarySoft,
  },

  vibeText: {
    fontSize: 12,
    color: colors.text,
  },

  genderWrap: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 6,
},

gender: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: 'center',
},

genderActive: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},

genderText: {
  color: colors.muted,
  fontSize: 14,
},

helper: {
  fontSize: 12,
  color: colors.muted,
  marginBottom: 18,
},

customVibeActive: {
  borderColor: colors.primary,
},
});
