// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract HodlersVault is Ownable {

    struct Hodling {
        uint256 value_;
        uint256 createTime_;
        uint256 releaseTime_;
    }

    /**
     * @dev HODLings.
     */
    mapping (address => Hodling[]) private _hodlings;

    event SetHodlPosition(address indexed _hodler, uint256 indexed _value, uint256 indexed _releaseTime);
    event WithdrawHodlPosition(address indexed _hodler, uint256 indexed _value, uint256 indexed _withdrawTime);
    event LiquidateHodlPosition(address indexed _hodler, uint256 indexed _value, uint256 indexed _liquidateTime);

    constructor(){
    }

    /**
     * @dev Throws if called for account with HODL positions count > 0.
     * @param _hodler The HODLer address.
     */
    modifier onlySinglePosition(address _hodler) {
        require(_hodlings[_hodler].length == 0, "HodlersVault: only single HODL position is possible.");
        _;
    }

    /**
     * @dev Retur HODL positions array for given HODLer.
     * @param _hodler The HODLer address.
     */
    function _getHodlingsFor(address _hodler) internal view returns(Hodling[] storage){
        return _hodlings[_hodler];
    }

    /**
     * @dev Returns list of HODL positions for given address.
     * @param _hodler Address to return HODL positions for.
     */
    function hodlingOf(address _hodler) external view returns(Hodling[] memory){
        return _getHodlingsFor(_hodler);
    }

    /**
     * @dev HODL new position for number of days.
     * @param _hodler Owner of new HODL position.
     * @param _days Number of days to HODL.
     *
     * NOTE: Only single HODL position is possible for single address.
     */
    function hodl(address _hodler, uint256 _days) external payable onlySinglePosition(_hodler) {
        require(msg.value > 0, "HodlersVault: can't HODL 0 tokens.");
        require(_hodler != address(0), "HodlersVault: can't HODL for 0x0 address.");

        uint256 releaseTime = block.timestamp + _days * 1 days;
        _hodlings[_hodler].push(Hodling({value_: msg.value, createTime_: block.timestamp, releaseTime_: block.timestamp + _days * 1 days}));
        emit SetHodlPosition(_hodler, msg.value, releaseTime);
    }

    /**
     * @dev Withdraw HODL position for given HODLer and given array index.
     * @param _hodler Address to withdraw HODL position to.
     * @param _idx Array index of HODL position.
     *
     * NOTE: Checks: 
     * - if caller is withdrawing its own funds
     * - if any HODL positions exist for caller
     * - if release time has passed
     */
    function withdrawHodlingFor(address payable _hodler, uint256 _idx) external {
        require(msg.sender == _hodler, "HodlersVault: Only owner of funds can withdraw them.");
        Hodling[] storage hodlings = _getHodlingsFor(_hodler);
        require(_idx >= 0 && _idx < hodlings.length, "HodlersVault: No HODL position exists at this location.");
        require(hodlings[_idx].releaseTime_ <= block.timestamp, "HodlersVault: Can't withdraw before release time.");

        uint256 value = hodlings[_idx].value_;

        delete hodlings[_idx];
        if(hodlings.length - 1 > 0){
            hodlings[_idx] = hodlings[hodlings.length-1];
        }

        payable(_hodler).transfer(value);
        emit WithdrawHodlPosition(_hodler, value, block.timestamp);
    }

    /**
     * @dev Liquidate HODL position for given HODLer and given array index. Only contract owner can do this.
     * @param _hodler Address to withdraw HODL position to.
     * @param _idx Array index of HODL position.
     *
     * NOTE: Validate call arguments:
     * - if passed inedx is valid
     */
    function liquidateHodlingFor(address _hodler, uint256 _idx) external onlyOwner {
        Hodling[] storage hodlings = _getHodlingsFor(_hodler);
        require(_idx >= 0 && _idx < hodlings.length, "HodlersVault: No HODL position exists at this location.");

        uint256 value = hodlings[_idx].value_;

        delete hodlings[_idx];
        if(hodlings.length - 1 > 0){
            hodlings[_idx] = hodlings[hodlings.length-1];
        }

        payable(_hodler).transfer(value);
        emit LiquidateHodlPosition(_hodler, value, block.timestamp);
    }

    /** 
     * @dev Withdrawals any ETH to owner address in case any ETH was forcibly transfered to this contract.
     */
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {
        revert("Contract doesn't accept Ether.");
    }

    fallback() external payable{
        revert("Contract doesn't accept Ether.");
    }
}