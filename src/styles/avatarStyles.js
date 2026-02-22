import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const avatar = StyleSheet.create({
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
  photoWrap: {
    width: '100%',
    marginTop: 14,
    marginBottom: 18,
  },
  photoCard: {
    width: '100%',
    height: 160,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoTitle: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.6,
  },
  photoSub: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 6,
  },
  photoClear: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoClearText: {
    color: colors.muted,
    fontSize: 12,
  },
  errorText: {
    color: '#ff8a8a',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -2,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    color: colors.subtle,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },

  card: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  cardActive: {
    backgroundColor: colors.primarySoft,
  },

  emoji: {
    fontSize: 28,
    marginBottom: 8,
  },

  label: {
    fontSize: 11,
    color: colors.muted,
  },

  labelActive: {
    color: '#fff',
  },

  helper: {
    marginTop: 14,
    textAlign: 'center',
    color: colors.subtle,
    fontSize: 12,
  },
});
