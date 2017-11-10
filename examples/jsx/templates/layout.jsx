const React = require('react');
const T = require('prop-types');

const Head = require('./includes/head.jsx');
const Foot = require('./includes/foot.jsx');

module.exports = class Layout extends React.PureComponent {

    render() {

        return (
            <html>
                <Head />
                <body>
                    {this.props.children}
                </body>
                <Foot year={this.props.year}/>
            </html>
        );
    }
};
