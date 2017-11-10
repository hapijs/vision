const React = require('react');

module.exports = class HeadComponent extends React.PureComponent {

    render() {
        return (
            <header>
                <h3>Head component</h3>
                <nav>
                    <a href='/'>Index</a>
                    <br />
                    <a href='/about'>About</a>
                </nav>
            </header>
        );
    }
};
