// import babel from 'rollup-plugin-babel';

export default {
    input: 'src/main.js',
    output: {
        file: 'build/tones.js',
        name: 'TONES',
        format: 'umd'
    },
    plugins: [
        /*babel({
            exclude: 'node_modules/**'
        })*/
    ]
};