export const Vars = {
	EASE_SLOW_SLOW: 'cubic-bezier(0.77, 0, 0.175, 1)',
	EASE_SLOW_FAST: 'cubic-bezier(0.5, 0, 0.75, 0)',
	EASE_FAST_SLOW: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
	PADDING: '48px',
	SHAPE: 'polygon(0 0, 100% 0, 100% calc(100% - 72px), calc(100% - 72px) 100%, 0 100%)',
	SHAPE_INVERTED: 'polygon(100% 100%, 100% calc(100% - 72px), calc(100% - 72px) 100%)',
};

export const Breakpoints = {
	MOBILE: 576,
};

export const MediaQueries = {
	MOBILE: `@media (max-width: ${Breakpoints.MOBILE}px)`,
};
