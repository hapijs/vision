const React = require('react');

module.exports = class FootComponent extends React.PureComponent {

    render() {

        return (
            <footer>
                Footer component
                <p>@ hapi visionaries {this.props.year}</p>
            </footer>
        );
    }
};
