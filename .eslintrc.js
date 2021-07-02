module.exports = {
	extends: [
		'xo',
	],
	plugins: [],
	overrides: [],
	env: {
        browser: true,
    },
	rules: {
		'comma-dangle': ['error', 'always-multiline'],
		'object-curly-spacing': ['error', 'always'],
		'no-empty-function': ['off'],
		'operator-linebreak': ['error', 'before'],
		'capitalized-comments': ['off'],
		'accessor-pairs': ['off'],
		'no-eq-null': ['off'],
		eqeqeq: ['error', 'always', { null: 'ignore' }],
		'no-await-in-loop': ['off'],
		'arrow-parens': ['error', 'always'],
		'new-cap': ['off'],
	},
};
