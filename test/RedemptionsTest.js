import DaoDeployment from "./helpers/DaoDeployment";

const Redemptions = artifacts.require('Redemptions')
const Vault = artifacts.require('Vault')
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory')
const MiniMeToken = artifacts.require('MiniMeToken')
const Erc20 = artifacts.require('BasicErc20')

const {assertRevert} = require('@aragon/test-helpers/assertThrow')

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const getLog = (receipt, logName, argName) => {
    const log = receipt.logs.find(({event}) => event === logName)
    return log ? log.args[argName] : null
}

const deployedContract = (receipt) =>
    getLog(receipt, 'NewAppProxy', 'proxy')

contract('Redemptions', ([rootAccount, ...accounts]) => {

    let daoDeployment = new DaoDeployment()
    let APP_MANAGER_ROLE, REDEEM_ROLE, ADD_TOKEN_ROLE, REMOVE_TOKEN_ROLE
    let vaultBase, vault, redeemableToken, redemptionsBase, redemptions

    before(async () => {
        await daoDeployment.deployBefore()

        vaultBase = await Vault.new()
        redemptionsBase = await Redemptions.new()

        APP_MANAGER_ROLE = await daoDeployment.kernelBase.APP_MANAGER_ROLE()
        REDEEM_ROLE = await redemptionsBase.REDEEM_ROLE()
        ADD_TOKEN_ROLE = await redemptionsBase.ADD_TOKEN_ROLE()
        REMOVE_TOKEN_ROLE = await redemptionsBase.REMOVE_TOKEN_ROLE()
    })

    beforeEach(async () => {
        await daoDeployment.deployBeforeEach(rootAccount)

        const newVaultAppReceipt = await daoDeployment.kernel.newAppInstance('0x5678', vaultBase.address, '0x', false, {from: rootAccount})
        vault = await Redemptions.at(deployedContract(newVaultAppReceipt))

        const newRedemptionsAppReceipt = await daoDeployment.kernel.newAppInstance('0x1234', redemptionsBase.address, '0x', false, {from: rootAccount})
        redemptions = await Redemptions.at(deployedContract(newRedemptionsAppReceipt))

        await daoDeployment.acl.createPermission(ANY_ADDRESS, redemptions.address, REDEEM_ROLE, rootAccount, {from: rootAccount})
        await daoDeployment.acl.createPermission(ANY_ADDRESS, redemptions.address, ADD_TOKEN_ROLE, rootAccount, {from: rootAccount})
        await daoDeployment.acl.createPermission(ANY_ADDRESS, redemptions.address, REMOVE_TOKEN_ROLE, rootAccount, {from: rootAccount})

        const miniMeTokenFactory = await MiniMeTokenFactory.new()
        redeemableToken = await MiniMeToken.new(miniMeTokenFactory.address, ZERO_ADDRESS, 0, 'RedeemableToken', 18, 'RDT', true)
    })

    context('initialize(Vault _vault, MiniMeToken _redeemableToken, address[] _vaultTokens)', ()=> {

        let token0, token1
        let expectedTokenAddresses

        beforeEach(async () => {
            token0 = await Erc20.new()
            token1 = await Erc20.new()
            expectedTokenAddresses = [token0.address, token1.address]
            await redemptions.initialize(vault.address, redeemableToken.address, expectedTokenAddresses)
        })

        it('should set initial values correctly', async () => {
            const actualVaultAddress = await redemptions.vault()
            const actualRedeemableToken = await redemptions.redeemableToken()
            const actualTokenAddedToken0 = await redemptions.tokenAdded(token0.address)
            const actualTokenAddedToken1 = await redemptions.tokenAdded(token1.address)
            const actualTokenAddresses = await redemptions.getVaultTokens()
            assert.strictEqual(actualVaultAddress, vault.address)
            assert.strictEqual(actualRedeemableToken, redeemableToken.address)
            assert.isTrue(actualTokenAddedToken0)
            assert.isTrue(actualTokenAddedToken1)
            assert.deepStrictEqual(actualTokenAddresses, expectedTokenAddresses)
        })

        // it('should not be decremented if already 0', async () => {
        //     redemptions.initialize()
        //     return assertRevert(async () => {
        //         return redemptions.decrement(1)
        //     })
        // })


    })
})
